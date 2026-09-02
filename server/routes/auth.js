import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db.js";

const router = express.Router();


// =====================================================
// POST : LOGIN
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  // -----------------------------
  // Validation
  // -----------------------------

  if (!email || !password) {
    return res.status(400).json({
      error: "Email et mot de passe requis",
    });
  }

  try {

    // -----------------------------
    // rechercher l'utilisateur
    // -----------------------------

    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.active,
        u.cabinet_id,
        c.name AS shopName
      FROM app_user u
      LEFT JOIN cabinet c
        ON c.id = u.cabinet_id
      WHERE u.email = ?
      `,
      [email]
    );

    const user = rows[0];

    // -----------------------------
    // utilisateur inexistant
    // -----------------------------

    if (!user) {
      return res.status(401).json({
        error: "Identifiants invalides",
      });
    }

    // -----------------------------
    // compte désactivé
    // -----------------------------

    if (!user.active) {
      return res.status(403).json({
        error: "Compte désactivé",
      });
    }

    // -----------------------------
    // vérifier mot de passe
    // -----------------------------

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Identifiants invalides",
      });
    }

    // -----------------------------
    // vérifier cabinet
    // -----------------------------

    if (!user.cabinet_id) {
      return res.status(403).json({
        error: "Cet utilisateur n'est associé à aucun cabinet",
      });
    }

    // -----------------------------
    // créer JWT
    // -----------------------------

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        cabinet_id: user.cabinet_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // -----------------------------
    // réponse
    // -----------------------------

    res.json({

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopName: user.shopName,
        cabinet_id: user.cabinet_id,
      },

    });

  } catch (err) {

    console.error("Erreur login :", err);

    res.status(500).json({
      error: "Erreur serveur",
    });

  }

});


// =====================================================
// POST : MOT DE PASSE OUBLIÉ
// POST /api/auth/forgot-password
//
// body: { email }
//
// MODE DEV/TEST :
// Aucun service d'email n'est configuré pour l'instant.
// Le lien de réinitialisation est donc renvoyé directement
// dans la réponse JSON (resetLink) pour que le frontend
// l'affiche à l'écran. À remplacer par un véritable envoi
// d'email (Nodemailer/SendGrid/...) plus tard : il suffira
// d'envoyer resetLink par email au lieu de le renvoyer au
// frontend.
// =====================================================

router.post("/forgot-password", async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email requis",
    });
  }

  // Message générique renvoyé dans tous les cas : on ne
  // révèle jamais si un email existe ou non en base
  // (bonne pratique de sécurité contre l'énumération de comptes).
  const genericMessage =
    "Si cet email existe, un lien de réinitialisation a été généré.";

  try {

    const [rows] = await db.query(
      `SELECT id, email FROM app_user WHERE email = ?`,
      [email]
    );

    const user = rows[0];

    if (!user) {
      return res.json({
        message: genericMessage,
      });
    }

    // -----------------------------
    // génération du token
    // -----------------------------

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await db.query(
      `UPDATE app_user
       SET reset_token = ?, reset_token_expires = ?
       WHERE id = ?`,
      [resetToken, expiresAt, user.id]
    );

    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:8080";

    const resetLink =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    res.json({
      message: genericMessage,
      resetLink,
    });

  } catch (err) {

    console.error("Erreur forgot-password :", err);

    res.status(500).json({
      error: "Erreur serveur",
    });

  }

});


// =====================================================
// POST : RÉINITIALISATION DU MOT DE PASSE
// POST /api/auth/reset-password
//
// body: { token, password }
// =====================================================

router.post("/reset-password", async (req, res) => {

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      error: "Token et nouveau mot de passe requis",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Le mot de passe doit contenir au moins 6 caractères",
    });
  }

  try {

    const [rows] = await db.query(
      `SELECT id, reset_token_expires
       FROM app_user
       WHERE reset_token = ?`,
      [token]
    );

    const user = rows[0];

    if (!user) {
      return res.status(400).json({
        error: "Lien de réinitialisation invalide",
      });
    }

    const expired =
      !user.reset_token_expires ||
      new Date(user.reset_token_expires) < new Date();

    if (expired) {
      return res.status(400).json({
        error: "Lien de réinitialisation expiré",
      });
    }

    // -----------------------------
    // hachage + mise à jour
    // -----------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE app_user
       SET password = ?, reset_token = NULL, reset_token_expires = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({
      message: "Mot de passe réinitialisé avec succès",
    });

  } catch (err) {

    console.error("Erreur reset-password :", err);

    res.status(500).json({
      error: "Erreur serveur",
    });

  }

});



export default router;