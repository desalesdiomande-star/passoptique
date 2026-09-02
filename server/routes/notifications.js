import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("notifications"));
// =====================================================
// GET : liste des notifications de l'utilisateur connecté
// GET /api/notifications
// =====================================================

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, type, message, \`time\`, \`read\`, user_id
       FROM notification
       WHERE user_id = ?
       ORDER BY \`time\` DESC
       LIMIT 100`,
      [req.user.id]
    );

    const notifications = rows.map(row => ({
      id: row.id,
      type: row.type,
      message: row.message,
      time: row.time,
      read: !!row.read,
    }));

    res.json(notifications);
  } catch (err) {
    console.error("Erreur GET /api/notifications :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================================================
// PATCH : marquer toutes les notifications comme lues
// PATCH /api/notifications/read-all
// =====================================================

router.patch("/read-all", async (req, res) => {
  try {
    await db.query(
      `UPDATE notification SET \`read\` = 1 WHERE user_id = ? AND \`read\` = 0`,
      [req.user.id]
    );

    res.json({ message: "Toutes les notifications sont marquées comme lues" });
  } catch (err) {
    console.error("Erreur PATCH /api/notifications/read-all :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================================================
// PATCH : marquer une notification comme lue
// PATCH /api/notifications/:id/read
// =====================================================

router.patch("/:id/read", async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE notification SET \`read\` = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Notification introuvable" });
    }

    res.json({ message: "Notification marquée comme lue" });
  } catch (err) {
    console.error("Erreur PATCH /api/notifications/:id/read :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;