import express from "express";
import { db } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();
router.use(requireAuth, requireRole("superadmin"));

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      (SELECT createdAt AS time, CONCAT('Nouveau cabinet inscrit: ', name) AS event, 'info' AS level
       FROM cabinet ORDER BY createdAt DESC LIMIT 5)
      UNION ALL
      (SELECT date AS time, CONCAT('Vente enregistrée: ', reference, ' (', FORMAT(total, 0), ' FCFA)') AS event, 'success' AS level
       FROM sale ORDER BY date DESC LIMIT 5)
      ORDER BY time DESC
      LIMIT 6
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;