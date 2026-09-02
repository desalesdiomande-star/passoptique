import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js"; // NOUVEAU

const router = express.Router();

router.use(requireAuth); // NOUVEAU — la liste clients n'était pas protégée avant

// =====================================================
// GET : récupérer tous les clients DU CABINET connecté
// =====================================================
router.get("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id; // NOUVEAU

  try {
    const [clients] = await db.query(
      `
      SELECT
        id,
        cabinet_id,
        firstName,
        lastName,
        phone,
        email,
        city,
        sex,
        age,
        notes,
        district,
        insurance,
        insuranceRate,
        isPrimaryInsured,
        cmuNumber
      FROM client
      WHERE cabinet_id = ?
      ORDER BY id DESC
      `,
      [cabinetId]
    );

    res.json(clients);

  } catch (error) {
    console.error("Erreur récupération clients :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des clients",
      error: error.message,
    });
  }
});


// =====================================================
// GET : récupérer un client par son ID (limité au cabinet)
// =====================================================
router.get("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id; // NOUVEAU

  try {
    const { id } = req.params;

    const [clients] = await db.query(
      `
      SELECT
        id,
        cabinet_id,
        firstName,
        lastName,
        phone,
        email,
        city,
        sex,
        age,
        notes,
        district,
        insurance,
        insuranceRate,
        isPrimaryInsured,
        cmuNumber
      FROM client
      WHERE id = ? AND cabinet_id = ?
      `,
      [id, cabinetId] // NOUVEAU — cabinetId ajouté
    );

    if (clients.length === 0) {
      return res.status(404).json({
        message: "Client introuvable",
      });
    }

    res.json(clients[0]);

  } catch (error) {
    console.error("Erreur récupération client :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération du client",
      error: error.message,
    });
  }
});


// =====================================================
// POST : ajouter un client (rattaché au cabinet connecté)
// =====================================================
router.post("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id; // NOUVEAU

  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      city,
      sex,
      age,
      notes,
      district,
      insurance,
      insuranceRate,
      isPrimaryInsured,
      cmuNumber,
    } = req.body;

    // -----------------------------
    // Validation
    // -----------------------------
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        message: "Nom, prénom et téléphone sont obligatoires",
      });
    }

    // -----------------------------
    // Vérifier si le téléphone existe DANS CE CABINET
    // (un même numéro peut exister dans deux cabinets différents)
    // -----------------------------
    const [existing] = await db.query(
      `
      SELECT id
      FROM client
      WHERE phone = ? AND cabinet_id = ?
      LIMIT 1
      `,
      [phone, cabinetId] // NOUVEAU
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Un client avec ce numéro existe déjà",
      });
    }

    // -----------------------------
    // INSERT
    // -----------------------------
    const [result] = await db.query(
      `
      INSERT INTO client (
        cabinet_id,
        firstName,
        lastName,
        phone,
        email,
        city,
        sex,
        age,
        notes,
        district,
        insurance,
        insuranceRate,
        isPrimaryInsured,
        cmuNumber
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        cabinetId, // NOUVEAU
        firstName,
        lastName,
        phone,
        email || "",
        city || "",
        sex || "M",
        Number(age) || 0,
        notes || "",
        district || "",
        insurance || "",
        Number(insuranceRate) || 0,
        isPrimaryInsured ? 1 : 0,
        cmuNumber || "",
      ]
    );

    // -----------------------------
    // récupérer le client créé
    // -----------------------------
    const [newClient] = await db.query(
      `
      SELECT
        id,
        cabinet_id,
        firstName,
        lastName,
        phone,
        email,
        city,
        sex,
        age,
        notes,
        district,
        insurance,
        insuranceRate,
        isPrimaryInsured,
        cmuNumber
      FROM client
      WHERE id = ?
      `,
      [result.insertId]
    );

    res.status(201).json(newClient[0]);

  } catch (error) {
    console.error("Erreur ajout client :", error);

    res.status(500).json({
      message: "Erreur lors de l'ajout du client",
      error: error.message,
    });
  }
});


// =====================================================
// DELETE : supprimer un client (limité au cabinet)
// =====================================================
router.delete("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id; // NOUVEAU

  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      DELETE FROM client
      WHERE id = ? AND cabinet_id = ?
      `,
      [id, cabinetId] // NOUVEAU
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Client introuvable",
      });
    }

    res.json({
      message: "Client supprimé avec succès",
    });

  } catch (error) {
    console.error("Erreur suppression client :", error);

    res.status(500).json({
      message: "Erreur lors de la suppression du client",
      error: error.message,
    });
  }
});

export default router;