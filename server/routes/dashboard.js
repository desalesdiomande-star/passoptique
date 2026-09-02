// server/routes/dashboard.js
//
// Réécrit pour correspondre exactement à la forme de données attendue par
// src/pages/DashboardPage.tsx (GET /api/dashboard/stats) :
// { revenue, sales, pendingOrders, readyGlasses, lowStock[], topProducts[], recentSales[] }

import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("dashboard"));
/**
 * GET /api/dashboard/stats
 * Tout le dashboard en un seul appel, dans la forme attendue par le frontend.
 */
router.get("/stats", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [[revenueRow]] = await db.query(
      `SELECT CAST(COALESCE(SUM(sa.total), 0) AS DECIMAL(12,2)) AS revenue
       FROM sale sa
       JOIN app_user au ON au.id = sa.user_id
       WHERE au.cabinet_id = ?
         AND DATE(sa.date) = CURDATE()
         AND sa.status IN ('paid', 'partial')`,
      [cabinetId]
    );

    const [[salesRow]] = await db.query(
      `SELECT COUNT(*) AS sales
       FROM sale sa
       JOIN app_user au ON au.id = sa.user_id
       WHERE au.cabinet_id = ?
         AND DATE(sa.date) = CURDATE()`,
      [cabinetId]
    );

    // "Commandes en attente" = pas encore prêtes ni livrées
    const [[pendingRow]] = await db.query(
      `SELECT COUNT(*) AS pendingOrders
       FROM sale sa
       JOIN app_user au ON au.id = sa.user_id
       WHERE au.cabinet_id = ?
         AND sa.orderStatus IN ('quote', 'ordered', 'production')`,
      [cabinetId]
    );

    const [[readyRow]] = await db.query(
      `SELECT COUNT(*) AS readyGlasses
       FROM sale sa
       JOIN app_user au ON au.id = sa.user_id
       WHERE au.cabinet_id = ?
         AND sa.orderStatus = 'ready'`,
      [cabinetId]
    );

    const [lowStock] = await db.query(
      `SELECT id, name, brand, ref, price, qty
       FROM product
       WHERE cabinet_id = ?
         AND qty <= 5
       ORDER BY qty ASC
       LIMIT 5`,
      [cabinetId]
    );

    const [topProducts] = await db.query(
      `SELECT p.id, p.name, p.brand, COUNT(*) AS qty
       FROM contient c
       JOIN product p ON p.id = c.product_id
       JOIN sale sa ON sa.id = c.sale_id
       JOIN app_user au ON au.id = sa.user_id
       WHERE au.cabinet_id = ?
       GROUP BY p.id, p.name, p.brand
       ORDER BY qty DESC
       LIMIT 5`,
      [cabinetId]
    );

    const [recentSales] = await db.query(
      `SELECT
         sa.id, sa.reference, sa.total, sa.status, sa.orderStatus, sa.date,
         cl.firstName, cl.lastName
       FROM sale sa
       JOIN app_user au ON au.id = sa.user_id
       JOIN client cl ON cl.id = sa.client_id
       WHERE au.cabinet_id = ?
       ORDER BY sa.date DESC
       LIMIT 5`,
      [cabinetId]
    );

    res.json({
      revenue: Number(revenueRow.revenue),
      sales: Number(salesRow.sales),
      pendingOrders: Number(pendingRow.pendingOrders),
      readyGlasses: Number(readyRow.readyGlasses),
      lowStock,
      topProducts,
      recentSales,
    });
  } catch (error) {
    console.error("Erreur récupération dashboard :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du dashboard",
      error: error.message,
    });
  }
});

export default router;