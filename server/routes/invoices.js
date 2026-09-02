// server/routes/invoices.js
//
// Les factures sont désormais générées automatiquement par sales.js
// (PATCH /api/sales/:id/order-status, quand une commande passe à 'ordered').
// Cette route est donc en lecture seule.

import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("invoices"));

/**
 * GET /api/invoices
 * Renvoie deux choses combinées, avec un champ `type` pour les distinguer :
 * - les vraies factures (table invoice) générées à la confirmation de commande
 * - les devis (sale.orderStatus = 'quote'), visibles dès leur création dans Ventes
 */
router.get("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    // --- Vraies factures ---
    const [invoices] = await db.query(
      `SELECT
         i.id, i.type, i.date, i.dueDate, i.status, i.paymentMethod,
         i.client_id, i.sale_id,
         cl.firstName, cl.lastName
       FROM invoice i
       JOIN client cl ON cl.id = i.client_id
       WHERE cl.cabinet_id = ?
       ORDER BY i.date DESC`,
      [cabinetId]
    );

    const invoiceIds = invoices.map(i => i.id);
    let invoiceItems = [];
    if (invoiceIds.length > 0) {
      [invoiceItems] = await db.query(
        `SELECT invoice_id, description, qty, unitPrice
         FROM invoice_items
         WHERE invoice_id IN (?)`,
        [invoiceIds]
      );
    }

    const invoiceResults = invoices.map(inv => ({
      id: inv.id,
      type: "invoice",
      client: `${inv.firstName} ${inv.lastName}`,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      sale_id: inv.sale_id,
      items: invoiceItems
        .filter(it => it.invoice_id === inv.id)
        .map(it => ({
          description: it.description,
          qty: it.qty,
          unitPrice: Number(it.unitPrice),
        })),
    }));

    // --- Devis (ventes pas encore confirmées) ---
    const [quotes] = await db.query(
      `SELECT
         sa.id, sa.reference, sa.date, sa.total,
         cl.firstName, cl.lastName
       FROM sale sa
       JOIN app_user au ON au.id = sa.user_id
       JOIN client cl ON cl.id = sa.client_id
       WHERE au.cabinet_id = ? AND sa.orderStatus = 'quote'
       ORDER BY sa.date DESC`,
      [cabinetId]
    );

    const quoteSaleIds = quotes.map(q => q.id);
    let quoteItems = [];
    if (quoteSaleIds.length > 0) {
      [quoteItems] = await db.query(
        `SELECT ct.sale_id, p.name AS description, p.price AS unitPrice
         FROM contient ct
         JOIN product p ON p.id = ct.product_id
         WHERE ct.sale_id IN (?)`,
        [quoteSaleIds]
      );
    }

    const quoteResults = quotes.map(q => ({
      id: q.reference ?? `V-${String(q.id).padStart(3, "0")}`,
      type: "quote",
      client: `${q.firstName} ${q.lastName}`,
      date: q.date,
      dueDate: null,
      status: "draft",
      paymentMethod: null,
      sale_id: q.id,
      items: quoteItems
        .filter(it => it.sale_id === q.id)
        .map(it => ({
          description: it.description,
          qty: 1,
          unitPrice: Number(it.unitPrice),
        })),
    }));

    res.json([...invoiceResults, ...quoteResults]);
  } catch (error) {
    console.error("Erreur récupération factures :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des factures",
      error: error.message,
    });
  }
});

export default router;