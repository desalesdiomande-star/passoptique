// server/routes/products.js
//
// Même pattern que clients.js : requireAuth + scoping direct sur
// product.cabinet_id (colonne déjà présente dans le schéma).

import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { createNotificationForCabinet } from "./notificationservice.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

const LOW_STOCK_THRESHOLD = 3; // même seuil que StockPage.tsx (p.qty <= 3)

router.use(requireAuth);
router.use(requirePermission("products"));

// =====================================================
// GET : récupérer tous les produits DU CABINET connecté
// =====================================================
router.get("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [products] = await db.query(
      `SELECT id, name, brand, ref, price, qty, type, cabinet_id
       FROM product
       WHERE cabinet_id = ?
       ORDER BY id DESC`,
      [cabinetId]
    );
    res.json(products);
  } catch (error) {
    console.error("Erreur récupération produits :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des produits",
      error: error.message,
    });
  }
});

// =====================================================
// GET : récupérer un produit par ID (limité au cabinet)
// =====================================================
router.get("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [products] = await db.query(
      `SELECT id, name, brand, ref, price, qty, type, cabinet_id
       FROM product
       WHERE id = ? AND cabinet_id = ?`,
      [req.params.id, cabinetId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    res.json(products[0]);
  } catch (error) {
    console.error("Erreur récupération produit :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du produit",
      error: error.message,
    });
  }
});

// =====================================================
// POST : ajouter un produit (rattaché au cabinet connecté)
// =====================================================
router.post("/", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const { name, brand, ref, price, qty, type } = req.body;

    if (!name || !brand) {
      return res.status(400).json({
        message: "Nom et marque sont obligatoires",
      });
    }

    const [result] = await db.query(
      `INSERT INTO product (name, brand, ref, price, qty, type, cabinet_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        brand,
        ref || "",
        Number(price) || 0,
        Number(qty) || 0,
        type || "frame",
        cabinetId,
      ]
    );

    const [newProduct] = await db.query(
      `SELECT id, name, brand, ref, price, qty, type, cabinet_id
       FROM product
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error("Erreur ajout produit :", error);
    res.status(500).json({
      message: "Erreur lors de l'ajout du produit",
      error: error.message,
    });
  }
});

// =====================================================
// PUT : mettre à jour un produit (ex: ajuster le stock)
// =====================================================
router.put("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id;
  const { name, brand, ref, price, qty, type } = req.body;
  const newQty = Number(qty) || 0;

  try {
    const [result] = await db.query(
      `UPDATE product
       SET name = ?, brand = ?, ref = ?, price = ?, qty = ?, type = ?
       WHERE id = ? AND cabinet_id = ?`,
      [
        name, brand, ref || "", Number(price) || 0, newQty, type,
        req.params.id, cabinetId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    const [updated] = await db.query(
      `SELECT id, name, brand, ref, price, qty, type, cabinet_id
       FROM product WHERE id = ?`,
      [req.params.id]
    );

    // Alerte stock bas : on ne bloque jamais la réponse à cause de ça
    if (newQty <= LOW_STOCK_THRESHOLD) {
      const product = updated[0];
      const message =
        `Stock faible: ${product.name} (${product.qty} restant${product.qty > 1 ? "s" : ""})`;
      createNotificationForCabinet(cabinetId, "stock_alert", message);
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Erreur mise à jour produit :", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du produit",
      error: error.message,
    });
  }
});

// =====================================================
// DELETE : supprimer un produit (limité au cabinet)
// =====================================================
router.delete("/:id", async (req, res) => {
  const cabinetId = req.user.cabinet_id;

  try {
    const [result] = await db.query(
      `DELETE FROM product WHERE id = ? AND cabinet_id = ?`,
      [req.params.id, cabinetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Erreur suppression produit :", error);
    res.status(500).json({
      message: "Erreur lors de la suppression du produit",
      error: error.message,
    });
  }
});

export default router;