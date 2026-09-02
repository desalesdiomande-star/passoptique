// server/routes/prescriptions.js
//
// Scoping cabinet : désormais basé directement sur client.cabinet_id
// (colonne ajoutée depuis, comme dans clients.js), plus simple et plus
// fiable que l'ancien join via `sale` — un client sans aucune vente a
// maintenant bien ses prescriptions visibles.

import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { createNotificationForCabinet } from "./notificationservice.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

const EXPIRY_REMINDER_DAYS = 30; // seuil au-delà duquel on ne prévient pas encore

router.use(requireAuth);
router.use(requirePermission("prescriptions"));

/**
 * GET /api/prescriptions
 * Liste des prescriptions des clients rattachés au cabinet courant (via sale)
 */
router.get("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [rows] = await db.query(
      `SELECT
         pres.id, pres.prescriber, pres.date, pres.expiryDate,
         pres.odSph, pres.odCyl, pres.odAxis, pres.odAdd,
         pres.ogSph, pres.ogCyl, pres.ogAxis, pres.ogAdd,
         pres.pd, pres.client_id,
         cl.firstName, cl.lastName
       FROM prescription pres
       JOIN client cl ON cl.id = pres.client_id
       WHERE cl.cabinet_id = ?
       ORDER BY pres.date DESC`,
      [cabinetId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /api/prescriptions/:id
 */
router.get("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [rows] = await db.query(
      `SELECT pres.*, cl.firstName, cl.lastName
       FROM prescription pres
       JOIN client cl ON cl.id = pres.client_id
       WHERE pres.id = ? AND cl.cabinet_id = ?`,
      [req.params.id, cabinetId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Prescription introuvable" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * POST /api/prescriptions
 * Crée une nouvelle prescription pour un client existant
 */
router.post("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;
  const {
    client_id, prescriber, date, expiryDate,
    odSph, odCyl, odAxis, odAdd,
    ogSph, ogCyl, ogAxis, ogAdd,
    pd,
  } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: "client_id est obligatoire" });
  }

  try {
    // Empêche de créer une prescription pour un client d'un autre cabinet
    const [clientRows] = await db.query(
      `SELECT id, firstName, lastName FROM client WHERE id = ? AND cabinet_id = ?`,
      [client_id, cabinetId]
    );
    if (clientRows.length === 0) {
      return res.status(403).json({ error: "Client introuvable dans ce cabinet" });
    }

    const [result] = await db.query(
      `INSERT INTO prescription
         (prescriber, date, expiryDate, odSph, odCyl, odAxis, odAdd, ogSph, ogCyl, ogAxis, ogAdd, pd, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prescriber || null,
        date || null,
        expiryDate || null,
        odSph || null, odCyl || null, odAxis || null, odAdd || null,
        ogSph || null, ogCyl || null, ogAxis || null, ogAdd || null,
        pd || null,
        client_id,
      ]
    );

    const [rows] = await db.query(
      `SELECT pres.*, cl.firstName, cl.lastName
       FROM prescription pres
       JOIN client cl ON cl.id = pres.client_id
       WHERE pres.id = ?`,
      [result.insertId]
    );

    // Rappel client : prescription déjà expirée ou qui expire bientôt
    if (expiryDate) {
      const daysLeft = Math.ceil(
        (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= EXPIRY_REMINDER_DAYS) {
        const client = clientRows[0];
        const message = daysLeft < 0
          ? `Prescription expirée pour ${client.firstName} ${client.lastName} — à recontacter`
          : `Prescription de ${client.firstName} ${client.lastName} expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`;
        createNotificationForCabinet(cabinetId, "contact_client", message);
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * PUT /api/prescriptions/:id
 */
router.put("/:id", async (req, res) => {
  const {
    prescriber, date, expiryDate,
    odSph, odCyl, odAxis, odAdd,
    ogSph, ogCyl, ogAxis, ogAdd,
    pd,
  } = req.body;

  try {
    await db.query(
      `UPDATE prescription SET
         prescriber = ?, date = ?, expiryDate = ?,
         odSph = ?, odCyl = ?, odAxis = ?, odAdd = ?,
         ogSph = ?, ogCyl = ?, ogAxis = ?, ogAdd = ?, pd = ?
       WHERE id = ?`,
      [
        prescriber || null, date || null, expiryDate || null,
        odSph || null, odCyl || null, odAxis || null, odAdd || null,
        ogSph || null, ogCyl || null, ogAxis || null, ogAdd || null,
        pd || null,
        req.params.id,
      ]
    );
    res.json({ message: "Prescription mise à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * DELETE /api/prescriptions/:id
 */
router.delete("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [result] = await db.query(
      `DELETE pres FROM prescription pres
       JOIN client cl ON cl.id = pres.client_id
       WHERE pres.id = ? AND cl.cabinet_id = ?`,
      [req.params.id, cabinetId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Prescription introuvable" });
    }
    res.json({ message: "Prescription supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;