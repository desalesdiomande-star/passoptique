import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db.js";

const router = express.Router();


// =====================================================
// POST : INSCRIPTION (rattacher un admin à un cabinet
// DÉJÀ EXISTANT)
// POST /api/auth/register
//
// body: { fullName, shopName, email, password }
//
// IMPORTANT : cette route NE CRÉE PAS de cabinet. Les
// cabinets sont créés en amont (typiquement via
// SuperAdminPage → POST /api/cabinet). Ici, shopName
// doit correspondre EXACTEMENT (après trim, sensible à
// la casse) au nom d'un cabinet déjà en base.
//
// RÈGLE MÉTIER :
// Un seul admin par cabinet. Dès qu'un cabinet a un
// admin, c'est à LUI d'ajouter les autres utilisateurs —
// toute nouvelle tentative d'inscription pour ce même
// cabinet est refusée.
// =====================================================

router.post("/register", async (req, res) => {

  const { fullName, shopName, email, password } = req.body;

  // -----------------------------
  // Validation
  // -----------------------------

  if (!fullName || !shopName || !email || !password) {
    return res.status(400).json({
      error: "Tous les champs sont obligatoires",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Le mot de passe doit contenir au moins 6 caractères",
    });
  }

  const cleanFullName = String(fullName).trim();
  const cleanShopName = String(shopName).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (!cleanFullName || !cleanShopName || !cleanEmail) {
    return res.status(400).json({
      error: "Tous les champs sont obligatoires",
    });
  }

  // -----------------------------
  // Transaction :
  //
  // Une connexion dédiée est nécessaire pour verrouiller
  // la vérification "le cabinet a-t-il déjà un admin ?"
  // et l'insertion du nouvel utilisateur dans la même
  // transaction, et éviter une course entre deux
  // inscriptions simultanées pour le même cabinet.
  // -----------------------------

  const connection = await db.getConnection();

  try {

    await connection.beginTransaction();

    // -----------------------------
    // email déjà utilisé ?
    // -----------------------------

    const [existingUsers] = await connection.query(
      `SELECT id FROM app_user WHERE email = ? LIMIT 1`,
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      connection.release();

      return res.status(409).json({
        error: "Un compte existe déjà avec cet email",
      });
    }

    // -----------------------------
    // le cabinet doit déjà exister
    //
    // Correspondance exacte sur le nom (après trim),
    // sensible à la casse, comme demandé.
    //
    // FOR UPDATE verrouille la ligne trouvée pour la
    // durée de la transaction, afin qu'une deuxième
    // inscription simultanée pour ce même cabinet
    // attende que la première se termine avant de
    // relire l'état "a-t-il déjà un admin ?".
    // -----------------------------

    const [cabinetRows] = await connection.query(
      `SELECT id, validated FROM cabinet WHERE TRIM(name) = ? LIMIT 1 FOR UPDATE`,
      [cleanShopName]
    );

    if (cabinetRows.length === 0) {
      await connection.rollback();
      connection.release();

      return res.status(404).json({
        error:
          "Aucun cabinet trouvé avec ce nom. Il doit d'abord être enregistré sur la plateforme.",
      });
    }

    const cabinetId = cabinetRows[0].id;

    // -----------------------------
    // RÈGLE MÉTIER : un seul admin par cabinet
    // -----------------------------

    const [existingAdmins] = await connection.query(
      `SELECT id FROM app_user WHERE cabinet_id = ? AND role = 'admin' LIMIT 1`,
      [cabinetId]
    );

    if (existingAdmins.length > 0) {
      await connection.rollback();
      connection.release();

      return res.status(409).json({
        error:
          "Ce cabinet a déjà un administrateur. Contactez-le pour qu'il vous ajoute comme utilisateur.",
      });
    }

    // -----------------------------
    // hacher le mot de passe
    // -----------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    // -----------------------------
    // créer l'utilisateur admin, lié au cabinet existant
    // -----------------------------

    const [userResult] = await connection.query(
      `
      INSERT INTO app_user
      (name, email, password, role, active, cabinet_id)
      VALUES (?, ?, ?, 'admin', 1, ?)
      `,
      [cleanFullName, cleanEmail, hashedPassword, cabinetId]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      message: "Compte créé avec succès",
      cabinetId,
      userId: userResult.insertId,
    });

  } catch (err) {

    await connection.rollback();
    connection.release();

    console.error("Erreur inscription :", err);

    res.status(500).json({
      error: "Erreur serveur",
    });

  }

});


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