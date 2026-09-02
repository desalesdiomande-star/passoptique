import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const canManage = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "directeur") {
    return res.status(403).json({ error: "Accès refusé" });
  }
  next();
};

// =====================================================
// GET /api/users -> liste des utilisateurs du cabinet
// =====================================================
router.get("/", requireAuth, canManage, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, active FROM app_user WHERE cabinet_id = ? ORDER BY id`,
      [req.user.cabinet_id]
    );
    res.json(rows.map(u => ({ ...u, active: !!u.active })));
  } catch (err) {
    console.error("Erreur GET /api/users :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================================================
// POST /api/users -> créer un utilisateur
// =====================================================
router.post("/", requireAuth, canManage, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nom, email et mot de passe requis" });
  }

  // seul un admin peut créer un autre admin
  if (role === "admin" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Seul un admin peut créer un compte admin" });
  }

  try {
    const [existing] = await db.query(`SELECT id FROM app_user WHERE email = ?`, [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO app_user (name, email, password, role, active, cabinet_id) VALUES (?, ?, ?, ?, 1, ?)`,
      [name, email, hashed, role || "vendeur", req.user.cabinet_id]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      role: role || "vendeur",
      active: true,
    });
  } catch (err) {
    console.error("Erreur POST /api/users :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================================================
// PATCH /api/users/:id/toggle -> activer / désactiver
// =====================================================
router.patch("/:id/toggle", requireAuth, canManage, async (req, res) => {
  const { id } = req.params;

  if (String(req.user.id) === String(id)) {
    return res.status(400).json({ error: "Vous ne pouvez pas désactiver votre propre compte" });
  }

  try {
    const [rows] = await db.query(
      `SELECT active FROM app_user WHERE id = ? AND cabinet_id = ?`,
      [id, req.user.cabinet_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const newActive = rows[0].active ? 0 : 1;
    await db.query(`UPDATE app_user SET active = ? WHERE id = ?`, [newActive, id]);

    res.json({ id, active: !!newActive });
  } catch (err) {
    console.error("Erreur PATCH /api/users/:id/toggle :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================================================
// DELETE /api/users/:id
// =====================================================
router.delete("/:id", requireAuth, canManage, async (req, res) => {
  const { id } = req.params;

  if (String(req.user.id) === String(id)) {
    return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
  }

  try {
    const [result] = await db.query(
      `DELETE FROM app_user WHERE id = ? AND cabinet_id = ?`,
      [id, req.user.cabinet_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur DELETE /api/users/:id :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;