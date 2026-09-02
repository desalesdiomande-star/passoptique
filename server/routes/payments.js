// server/routes/payments.js

import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("payments"));

/**
 * GET /api/payments
 * Liste des paiements du cabinet + résumé
 */
router.get("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [payments] = await db.query(
      `SELECT
         p.id, p.paid, p.method, p.date,
         s.id AS sale_id, s.reference, s.total,
         c.firstName, c.lastName
       FROM payment p
       JOIN sale s ON s.id = p.sale_id
       JOIN app_user au ON au.id = s.user_id
       JOIN client c ON c.id = s.client_id
       WHERE au.cabinet_id = ?
       ORDER BY p.date DESC`,
      [cabinetId]
    );

    const [[{ totalAmount }]] = await db.query(
      `SELECT CAST(COALESCE(SUM(t.total), 0) AS DECIMAL(12,2)) AS totalAmount
       FROM (
         SELECT DISTINCT s.id, s.total
         FROM sale s
         JOIN app_user au ON au.id = s.user_id
         WHERE au.cabinet_id = ? AND s.orderStatus != 'quote'
       ) t`,
      [cabinetId]
    );

    const [[{ amountPaid }]] = await db.query(
      `SELECT CAST(COALESCE(SUM(p.paid), 0) AS DECIMAL(12,2)) AS amountPaid
       FROM payment p
       JOIN sale s ON s.id = p.sale_id
       JOIN app_user au ON au.id = s.user_id
       WHERE au.cabinet_id = ?`,
      [cabinetId]
    );

    res.json({
      summary: {
        totalAmount: Number(totalAmount),
        amountPaid: Number(amountPaid),
        remaining: Number(totalAmount) - Number(amountPaid),
      },
      payments,
    });
  } catch (error) {
    console.error("Erreur récupération paiements :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des paiements",
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/unpaid-sales
 * Ventes confirmées (orderStatus != 'quote') pas encore soldées, pour le
 * sélecteur du formulaire "Nouveau paiement".
 */
router.get("/unpaid-sales", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [rows] = await db.query(
      `SELECT
         s.id, s.reference, s.total,
         c.firstName, c.lastName,
         CAST(COALESCE(SUM(p.paid), 0) AS DECIMAL(12,2)) AS alreadyPaid
       FROM sale s
       JOIN app_user au ON au.id = s.user_id
       JOIN client c ON c.id = s.client_id
       LEFT JOIN payment p ON p.sale_id = s.id
       WHERE au.cabinet_id = ?
         AND s.orderStatus != 'quote'
         AND s.status IN ('unpaid', 'partial')
       GROUP BY s.id
       HAVING alreadyPaid < s.total
       ORDER BY s.date DESC`,
      [cabinetId]
    );

    res.json(rows.map(r => ({
      ...r,
      total: Number(r.total),
      alreadyPaid: Number(r.alreadyPaid),
      remaining: Number(r.total) - Number(r.alreadyPaid),
    })));
  } catch (error) {
    console.error("Erreur récupération ventes non soldées :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des ventes non soldées",
      error: error.message,
    });
  }
});

/**
 * POST /api/payments
 * Enregistre un paiement sur une vente confirmée, met à jour son statut
 * (et celui de la facture liée).
 * body: { sale_id, paid, method }
 */
router.post("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;
  const { sale_id, paid, method } = req.body;

  if (!sale_id || !paid || Number(paid) <= 0) {
    return res.status(400).json({ message: "sale_id et un montant paid > 0 sont obligatoires" });
  }

  try {
    const [saleRows] = await db.query(
      `SELECT s.id, s.client_id, s.total
       FROM sale s
       JOIN app_user au ON au.id = s.user_id
       WHERE s.id = ? AND au.cabinet_id = ?`,
      [sale_id, cabinetId]
    );
    if (saleRows.length === 0) {
      return res.status(403).json({ message: "Vente introuvable dans ce cabinet" });
    }
    const sale = saleRows[0];

    const [result] = await db.query(
      `INSERT INTO payment (paid, method, sale_id, client_id) VALUES (?, ?, ?, ?)`,
      [Number(paid), method || null, sale_id, sale.client_id]
    );

    const [[{ totalPaid }]] = await db.query(
      `SELECT CAST(COALESCE(SUM(paid), 0) AS DECIMAL(12,2)) AS totalPaid
       FROM payment WHERE sale_id = ?`,
      [sale_id]
    );

    const newStatus = Number(totalPaid) >= Number(sale.total)
      ? "paid"
      : Number(totalPaid) > 0
        ? "partial"
        : "unpaid";

    await db.query(`UPDATE sale SET status = ? WHERE id = ?`, [newStatus, sale_id]);
    await db.query(`UPDATE invoice SET status = ? WHERE sale_id = ?`, [newStatus, sale_id]);

    const [newPayment] = await db.query(
      `SELECT id, paid, method, date, sale_id, client_id FROM payment WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ ...newPayment[0], saleStatus: newStatus });
  } catch (error) {
    console.error("Erreur ajout paiement :", error);
    res.status(500).json({
      message: "Erreur lors de l'ajout du paiement",
      error: error.message,
    });
  }
});

export default router;