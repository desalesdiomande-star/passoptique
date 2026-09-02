import express from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/* =========================================================
   SUPERADMIN UNIQUEMENT
========================================================= */
router.use(
  requireAuth,
  requireRole("superadmin")
);

/* =========================================================
   PARAMÈTRES PAR DÉFAUT

   Aucun besoin de table platform_settings.

   Les paramètres sont enregistrés dans la table maintenance.
========================================================= */

const DEFAULTS = {
  platform_name: "PASS OPTIQUE by MTN",
  support_email: "support@passoptique.ci",
  trial_duration_days: 14,
  monthly_price: 50000,
  max_users_per_cabinet: 10,
  platform_version: "1.0.0",
};

/* =========================================================
   RÉCUPÉRER LES PARAMÈTRES
========================================================= */

const getSettings = async () => {
  try {
    const [rows] = await db.query(
      `
      SELECT message
      FROM maintenance
      WHERE action = 'platform_settings'
      ORDER BY id DESC
      LIMIT 1
      `
    );

    if (
      !rows ||
      rows.length === 0 ||
      !rows[0].message
    ) {
      return { ...DEFAULTS };
    }

    let savedSettings;

    try {
      savedSettings =
        typeof rows[0].message === "string"
          ? JSON.parse(rows[0].message)
          : rows[0].message;
    } catch (error) {
      console.error(
        "Erreur parsing paramètres plateforme :",
        error
      );

      return { ...DEFAULTS };
    }

    return {
      ...DEFAULTS,
      ...savedSettings,
    };
  } catch (error) {
    console.error(
      "Erreur récupération paramètres :",
      error
    );

    return { ...DEFAULTS };
  }
};

/* =========================================================
   GET /api/settings

   Retourne les paramètres enregistrés.
========================================================= */

router.get("/", async (req, res) => {
  try {
    const settings = await getSettings();

    res.json(settings);
  } catch (error) {
    console.error(
      "Erreur GET /api/settings :",
      error
    );

    res.status(500).json({
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   PUT /api/settings

   Enregistre les paramètres.

   Exemple :

   {
     "platformName": "PASS OPTIQUE",
     "supportEmail": "support@test.ci",
     "trialDurationDays": 30,
     "monthlyPrice": 75000,
     "maxUsersPerCabinet": 15,
     "platformVersion": "1.0.1"
   }
========================================================= */

router.put("/", async (req, res) => {
  try {
    const userId = req.user?.id ?? null;

    const {
      platformName,
      supportEmail,
      trialDurationDays,
      monthlyPrice,
      maxUsersPerCabinet,
      platformVersion,
    } = req.body;

    /* =====================================================
       PARAMÈTRES ACTUELS
    ===================================================== */

    const current = await getSettings();

    /* =====================================================
       NOM DE LA PLATEFORME
    ===================================================== */

    const finalPlatformName =
      typeof platformName === "string" &&
      platformName.trim() !== ""
        ? platformName.trim()
        : current.platform_name;

    /* =====================================================
       EMAIL SUPPORT
    ===================================================== */

    const finalSupportEmail =
      typeof supportEmail === "string" &&
      supportEmail.trim() !== ""
        ? supportEmail.trim()
        : current.support_email;

    /* =====================================================
       DURÉE ESSAI
    ===================================================== */

    const trialValue =
      Number(trialDurationDays);

    const finalTrialDuration =
      Number.isFinite(trialValue) &&
      trialValue > 0
        ? Math.floor(trialValue)
        : Number(current.trial_duration_days) ||
          DEFAULTS.trial_duration_days;

    /* =====================================================
       PRIX MENSUEL
    ===================================================== */

    const priceValue =
      Number(monthlyPrice);

    const finalMonthlyPrice =
      Number.isFinite(priceValue) &&
      priceValue >= 0
        ? priceValue
        : Number(current.monthly_price) ||
          DEFAULTS.monthly_price;

    /* =====================================================
       NOMBRE MAX UTILISATEURS
    ===================================================== */

    const usersValue =
      Number(maxUsersPerCabinet);

    const finalMaxUsers =
      Number.isFinite(usersValue) &&
      usersValue > 0
        ? Math.floor(usersValue)
        : Number(current.max_users_per_cabinet) ||
          DEFAULTS.max_users_per_cabinet;

    /* =====================================================
       VERSION
    ===================================================== */

    const finalPlatformVersion =
      typeof platformVersion === "string" &&
      platformVersion.trim() !== ""
        ? platformVersion.trim()
        : current.platform_version ||
          DEFAULTS.platform_version;

    /* =====================================================
       OBJET FINAL

       IMPORTANT :
       On garde exactement les mêmes noms que DEFAULTS.
    ===================================================== */

    const settings = {
      platform_name: finalPlatformName,
      support_email: finalSupportEmail,
      trial_duration_days: finalTrialDuration,
      monthly_price: finalMonthlyPrice,
      max_users_per_cabinet: finalMaxUsers,
      platform_version: finalPlatformVersion,
    };

    /* =====================================================
       CONVERSION JSON
    ===================================================== */

    const settingsJson =
      JSON.stringify(settings);

    /* =====================================================
       TRANSACTION

       On supprime uniquement l'ancienne configuration
       platform_settings.

       Les autres messages de maintenance restent intacts.
    ===================================================== */

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
        DELETE FROM maintenance
        WHERE action = 'platform_settings'
        `
      );

      await connection.query(
        `
        INSERT INTO maintenance
        (
          user_id,
          action,
          message,
          status
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          userId,
          "platform_settings",
          settingsJson,
          "success",
        ]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    /* =====================================================
       JOURNAL DE MODIFICATION

       Ce message est différent de platform_settings.
       Il permet de garder une trace de la modification.
    ===================================================== */

    try {
      await db.query(
        `
        INSERT INTO maintenance
        (
          user_id,
          action,
          message,
          status
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          userId,
          "settings_update",
          `Paramètres modifiés : ${settingsJson}`,
          "info",
        ]
      );
    } catch (logError) {
      console.error(
        "Erreur journalisation paramètres :",
        logError
      );
    }

    /* =====================================================
       RÉPONSE
    ===================================================== */

    res.json({
      message:
        "Paramètres enregistrés avec succès",

      settings,
    });
  } catch (error) {
    console.error(
      "Erreur PUT /api/settings :",
      error
    );

    res.status(500).json({
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   EXPORT
========================================================= */

export default router;