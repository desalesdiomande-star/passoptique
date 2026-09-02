import express from "express";
import { db } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();
router.use(requireAuth, requireRole("superadmin"));

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(months.month_start, '%b') AS month,
        (
          SELECT COUNT(*) FROM cabinet c2
          WHERE c2.createdAt <= LAST_DAY(months.month_start)
        ) AS cabinets,
        CAST(COALESCE((
          SELECT SUM(sa.total)
          FROM sale sa
          WHERE sa.status IN ('paid', 'partial')
            AND sa.date BETWEEN months.month_start AND LAST_DAY(months.month_start)
        ), 0) AS DECIMAL(12,2)) AS revenue
      FROM (
        SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL n MONTH) AS month_start
        FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) seq
      ) months
      ORDER BY months.month_start ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;