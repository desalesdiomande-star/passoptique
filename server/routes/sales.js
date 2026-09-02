// server/routes/sales.js
//
// NOUVEAU PIPELINE :
// 1. POST /          -> crée un DEVIS (sale.status='quote', orderStatus='quote')
//                        pas de paiement, pas de décrément de stock.
// 2. PATCH /:id/order-status avec orderStatus='ordered' (bouton "Commandé")
//        -> décrémente le stock
//        -> génère automatiquement une facture (invoice + invoice_items)
//        -> passe sale.status à 'unpaid'
// 3. Le paiement se fait ensuite via POST /api/payments (voir payments.js),
//    qui met à jour sale.status ('unpaid' -> 'partial' -> 'paid').

import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { createNotificationForCabinet } from "./notificationservice.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("sales"));

const VALID_ORDER_STATUSES = ["quote", "ordered", "production", "ready", "delivered"];
const LOW_STOCK_THRESHOLD = 3; // même seuil que products.js / StockPage.tsx

// Génère un ID de facture unique (FAC-XXX), scopé par cabinet, sans collision globale
async function generateInvoiceId(cabinetId) {
  const [[{ cnt }]] = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM invoice i
     JOIN client cl ON cl.id = i.client_id
     WHERE cl.cabinet_id = ? AND i.type = 'invoice'`,
    [cabinetId]
  );

  let n = Number(cnt) + 1;
  let id = `FAC-${String(n).padStart(3, "0")}`;

  // Sécurité anti-collision : invoice.id est une clé globale, pas par cabinet
  while (true) {
    const [existing] = await db.query(`SELECT id FROM invoice WHERE id = ?`, [id]);
    if (existing.length === 0) break;
    n += 1;
    id = `FAC-${String(n).padStart(3, "0")}`;
  }

  return id;
}

/**
 * GET /api/sales
 */
router.get("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [sales] = await db.query(
      `SELECT
         s.id, s.reference, s.date, s.total, s.status, s.orderStatus,
         c.firstName, c.lastName,
         GROUP_CONCAT(p.name SEPARATOR ', ') AS items
       FROM sale s
       JOIN app_user au ON au.id = s.user_id
       JOIN client c ON c.id = s.client_id
       LEFT JOIN contient ct ON ct.sale_id = s.id
       LEFT JOIN product p ON p.id = ct.product_id
       WHERE au.cabinet_id = ?
       GROUP BY s.id
       ORDER BY s.date DESC`,
      [cabinetId]
    );

    res.json(sales);
  } catch (error) {
    console.error("Erreur récupération ventes :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des ventes",
      error: error.message,
    });
  }
});

/**
 * POST /api/sales
 * Crée un DEVIS : sale + lignes contient. Pas de paiement, pas de décrément de stock.
 * body: { client_id, frame_id?, lens_id? }
 */
router.post("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;
  const userId = req.user.id;
  const { client_id, frame_id, lens_id } = req.body;

  if (!client_id) {
    return res.status(400).json({ message: "client_id est obligatoire" });
  }
  if (!frame_id && !lens_id) {
    return res.status(400).json({ message: "Sélectionnez au moins une monture ou des verres" });
  }

  const productIds = [frame_id, lens_id].filter(Boolean);

  try {
    const [clientRows] = await db.query(
      `SELECT id FROM client WHERE id = ? AND cabinet_id = ?`,
      [client_id, cabinetId]
    );
    if (clientRows.length === 0) {
      return res.status(403).json({ message: "Client introuvable dans ce cabinet" });
    }

    const [products] = await db.query(
      `SELECT id, price FROM product WHERE id IN (?) AND cabinet_id = ?`,
      [productIds, cabinetId]
    );
    if (products.length !== productIds.length) {
      return res.status(403).json({ message: "Un des produits sélectionnés est introuvable dans ce cabinet" });
    }

    const total = products.reduce((sum, p) => sum + Number(p.price), 0);

    const [saleResult] = await db.query(
      `INSERT INTO sale (date, total, status, orderStatus, client_id, user_id, reference)
       VALUES (NOW(), ?, 'quote', 'quote', ?, ?, NULL)`,
      [total, client_id, userId]
    );
    const saleId = saleResult.insertId;

    const reference = `V-${String(saleId).padStart(3, "0")}`;
    await db.query(`UPDATE sale SET reference = ? WHERE id = ?`, [reference, saleId]);

    for (const productId of productIds) {
      await db.query(`INSERT INTO contient (sale_id, product_id) VALUES (?, ?)`, [saleId, productId]);
    }

    const [newSale] = await db.query(
      `SELECT
         s.id, s.reference, s.date, s.total, s.status, s.orderStatus,
         c.firstName, c.lastName,
         GROUP_CONCAT(p.name SEPARATOR ', ') AS items
       FROM sale s
       JOIN client c ON c.id = s.client_id
       LEFT JOIN contient ct ON ct.sale_id = s.id
       LEFT JOIN product p ON p.id = ct.product_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [saleId]
    );

    res.status(201).json(newSale[0]);
  } catch (error) {
    console.error("Erreur création devis :", error);
    res.status(500).json({
      message: "Erreur lors de la création du devis",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/sales/:id/order-status
 * Fait progresser le statut de commande.
 * Passage 'quote' -> 'ordered' : décrémente le stock + génère la facture.
 */
router.patch("/:id/order-status", async (req, res) => {
  const cabinetId = req.user.cabinet_id;
  const { orderStatus } = req.body;

  if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
    return res.status(400).json({
      message: `orderStatus doit être l'un de : ${VALID_ORDER_STATUSES.join(", ")}`,
    });
  }

  try {
    const [saleRows] = await db.query(
      `SELECT s.id, s.orderStatus, s.client_id, s.total, s.reference,
              cl.firstName, cl.lastName
       FROM sale s
       JOIN app_user au ON au.id = s.user_id
       JOIN client cl ON cl.id = s.client_id
       WHERE s.id = ? AND au.cabinet_id = ?`,
      [req.params.id, cabinetId]
    );

    if (saleRows.length === 0) {
      return res.status(404).json({ message: "Vente introuvable dans ce cabinet" });
    }

    const sale = saleRows[0];
    const wasQuote = sale.orderStatus === "quote";
    const clientName = `${sale.firstName} ${sale.lastName}`;

    await db.query(`UPDATE sale SET orderStatus = ? WHERE id = ?`, [orderStatus, sale.id]);

    let invoiceCreated = null;

    // Confirmation du devis en commande : décrément stock + génération facture
    if (wasQuote && orderStatus === "ordered") {
      const [contientRows] = await db.query(
        `SELECT product_id FROM contient WHERE sale_id = ?`,
        [sale.id]
      );
      const productIds = contientRows.map(r => r.product_id);

      for (const productId of productIds) {
        await db.query(`UPDATE product SET qty = GREATEST(qty - 1, 0) WHERE id = ?`, [productId]);
      }

      const [productDetails] = productIds.length
        ? await db.query(`SELECT id, name, price, qty FROM product WHERE id IN (?)`, [productIds])
        : [[]];

      // Alerte stock bas pour tout produit qui vient de passer sous le seuil
      for (const p of productDetails) {
        if (p.qty <= LOW_STOCK_THRESHOLD) {
          createNotificationForCabinet(
            cabinetId,
            "stock_alert",
            `Stock faible: ${p.name} (${p.qty} restant${p.qty > 1 ? "s" : ""})`
          );
        }
      }

      const invoiceId = await generateInvoiceId(cabinetId);

      await db.query(
        `INSERT INTO invoice (id, type, date, dueDate, status, paymentMethod, client_id, sale_id)
         VALUES (?, 'invoice', NOW(), NULL, 'unpaid', NULL, ?, ?)`,
        [invoiceId, sale.client_id, sale.id]
      );

      for (const p of productDetails) {
        await db.query(
          `INSERT INTO invoice_items (invoice_id, description, qty, unitPrice)
           VALUES (?, ?, 1, ?)`,
          [invoiceId, p.name, p.price]
        );
      }

      await db.query(`UPDATE sale SET status = 'unpaid' WHERE id = ?`, [sale.id]);
      invoiceCreated = invoiceId;

      createNotificationForCabinet(
        cabinetId,
        "order_arrived",
        `Commande #${sale.reference ?? sale.id} confirmée pour ${clientName} — facture ${invoiceId} générée`
      );
    }

    // Lunettes prêtes à retirer
    if (orderStatus === "ready") {
      createNotificationForCabinet(
        cabinetId,
        "glasses_ready",
        `Lunettes de ${clientName} prêtes à retirer`
      );
    }

    res.json({ message: "Statut mis à jour", orderStatus, invoiceCreated });
  } catch (error) {
    console.error("Erreur mise à jour statut commande :", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du statut",
      error: error.message,
    });
  }
});

export default router;