import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// =====================================================
// GET : infos de la boutique / du cabinet de l'utilisateur connecté
// GET /api/shop/me
// =====================================================

router.get("/me", requireAuth, async (req, res) => {
  try {
    const cabinetId = req.user.cabinet_id;

    if (!cabinetId) {
      return res.status(404).json({ error: "Aucun cabinet associé à cet utilisateur" });
    }

    const [rows] = await db.query(
      `SELECT id, name, owner, ownerExerciseNumber, clinicExerciseNumber,
              authorizationNumber, email, phone, city, district, address
       FROM cabinet
       WHERE id = ?`,
      [cabinetId]
    );

    const cabinet = rows[0];

    if (!cabinet) {
      return res.status(404).json({ error: "Cabinet introuvable" });
    }

    const [userRows] = await db.query(
      `SELECT name FROM app_user WHERE id = ?`,
      [req.user.id]
    );

    const opticianName = userRows[0]?.name || cabinet.owner || "";

    res.json({
      name: cabinet.name || "",
      address: [cabinet.address, cabinet.district, cabinet.city]
        .filter(Boolean)
        .join(", "),
      phone: cabinet.phone || "",
      authorization: cabinet.authorizationNumber || "",
      optician: opticianName,
      exerciseNumber: cabinet.clinicExerciseNumber || cabinet.ownerExerciseNumber || "",
    });
  } catch (err) {
    console.error("Erreur /api/shop/me :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================================================
// PUT : mise à jour des infos du cabinet
// PUT /api/shop/me
// =====================================================
router.put("/me", requireAuth, async (req, res) => {
  try {
    const cabinetId = req.user.cabinet_id;
    if (!cabinetId) {
      return res.status(404).json({ error: "Aucun cabinet associé à cet utilisateur" });
    }

    if (req.user.role !== "admin" && req.user.role !== "directeur") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const { name, address, phone, authorization, exerciseNumber } = req.body;

    await db.query(
      `UPDATE cabinet
       SET name = ?, address = ?, phone = ?, authorizationNumber = ?, clinicExerciseNumber = ?
       WHERE id = ?`,
      [name, address, phone, authorization, exerciseNumber, cabinetId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur PUT /api/shop/me :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
