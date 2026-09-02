import express from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("superadmin"));

/* =========================================================
   PARAMÈTRES PAR DÉFAUT DE LA PLATEFORME
   Aucun besoin de table platform_settings.
   Les paramètres personnalisés sont enregistrés dans
   la table maintenance.
========================================================= */

const DEFAULT_PLATFORM_SETTINGS = {
  platformName: "PASS OPTIQUE by MTN",
  supportEmail: "support@passoptique.ci",
  trialDurationDays: 14,
  monthlySubscriptionPrice: 50000,
  maxUsersPerCabinet: 10,
  platformVersion: "1.0.0",
};

/* =========================================================
   RÉCUPÉRER LES PARAMÈTRES DE LA PLATEFORME

   Les paramètres sont enregistrés dans :
   maintenance

   action = "platform_settings"

   message = JSON des paramètres
========================================================= */

const getPlatformSettings = async () => {
  try {
    const [rows] = await db.query(
      `SELECT message
       FROM maintenance
       WHERE action = 'platform_settings'
       ORDER BY id DESC
       LIMIT 1`
    );

    if (!rows.length || !rows[0].message) {
      return { ...DEFAULT_PLATFORM_SETTINGS };
    }

    try {
      const parsed = JSON.parse(rows[0].message);

      return {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...parsed,
      };
    } catch (parseError) {
      console.error(
        "Erreur parsing paramètres plateforme :",
        parseError
      );

      return { ...DEFAULT_PLATFORM_SETTINGS };
    }
  } catch (err) {
    console.error(
      "Erreur récupération paramètres plateforme :",
      err
    );

    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
};

/* =========================================================
   NOTIFICATION DES ABONNEMENTS EXPIRÉS

   On ne suspend PAS automatiquement le cabinet.

   On crée simplement une notification dans maintenance.
   Le SuperAdmin décide ensuite manuellement de suspendre
   le cabinet avec toggle-subscription.

   expiry_notified_at empêche d'envoyer plusieurs fois la
   même notification.
========================================================= */

const notifyExpiredSubscriptions = async () => {
  try {
    const [expired] = await db.query(`
      SELECT
        id,
        name,
        subscription_expires_at
      FROM cabinet
      WHERE subscription IN ('active', 'trial')
        AND subscription_expires_at IS NOT NULL
        AND subscription_expires_at < NOW()
        AND (
          expiry_notified_at IS NULL
          OR expiry_notified_at < subscription_expires_at
        )
    `);

    for (const cabinet of expired) {
      try {
        await db.query(
          `INSERT INTO maintenance
           (user_id, action, message, status)
           VALUES (?, ?, ?, ?)`,
          [
            null,
            "subscription_expired",
            `Abonnement expiré pour le cabinet "${cabinet.name}" (id ${cabinet.id}) — suspension à faire manuellement.`,
            "warning",
          ]
        );

        await db.query(
          `UPDATE cabinet
           SET expiry_notified_at = NOW()
           WHERE id = ?`,
          [cabinet.id]
        );
      } catch (notificationError) {
        console.error(
          `Erreur notification cabinet ${cabinet.id} :`,
          notificationError
        );
      }
    }
  } catch (err) {
    console.error(
      "Erreur vérification abonnements expirés :",
      err
    );
  }
};

/* =========================================================
   GET /api/cabinet/settings

   Récupère les paramètres globaux de la plateforme.

   IMPORTANT :
   Le frontend (SuperAdminPage.tsx) attend une réponse
   au format { success: true, settings: {...} }.
   Sans le champ "success", les paramètres chargés ne sont
   jamais appliqués côté React (voir fetchPlatformSettings).
========================================================= */

router.get("/settings", async (req, res) => {
  try {
    const settings = await getPlatformSettings();

    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error(
      "Erreur GET /api/cabinet/settings :",
      err
    );

    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   PUT /api/cabinet/settings

   Enregistre les paramètres globaux.

   Aucun nouveau tableau SQL n'est nécessaire.

   Les paramètres sont stockés dans maintenance.message
   sous forme de JSON.

   IMPORTANT :
   Le frontend (savePlatformSettings) vérifie
   `if (!data?.success) throw new Error(...)`.
   Sans "success: true" ici, la sauvegarde en base
   réussissait déjà, mais le frontend affichait quand
   même une erreur et ne réinitialisait pas l'état "dirty".
========================================================= */

router.put("/settings", async (req, res) => {
  try {
    const currentSettings = await getPlatformSettings();

    const {
      platformName,
      supportEmail,
      trialDurationDays,
      monthlySubscriptionPrice,
      maxUsersPerCabinet,
      platformVersion,
    } = req.body;

    /* -----------------------------------------------------
       Nettoyage et validation des données
    ----------------------------------------------------- */

    const cleanPlatformName =
      typeof platformName === "string" &&
      platformName.trim() !== ""
        ? platformName.trim()
        : currentSettings.platformName;

    const cleanSupportEmail =
      typeof supportEmail === "string" &&
      supportEmail.trim() !== ""
        ? supportEmail.trim()
        : currentSettings.supportEmail;

    const cleanTrialDurationDays =
      Number.isFinite(Number(trialDurationDays)) &&
      Number(trialDurationDays) > 0
        ? Math.floor(Number(trialDurationDays))
        : currentSettings.trialDurationDays;

    const cleanMonthlySubscriptionPrice =
      Number.isFinite(Number(monthlySubscriptionPrice)) &&
      Number(monthlySubscriptionPrice) >= 0
        ? Number(monthlySubscriptionPrice)
        : currentSettings.monthlySubscriptionPrice;

    const cleanMaxUsersPerCabinet =
      Number.isFinite(Number(maxUsersPerCabinet)) &&
      Number(maxUsersPerCabinet) > 0
        ? Math.floor(Number(maxUsersPerCabinet))
        : currentSettings.maxUsersPerCabinet;

    const cleanPlatformVersion =
      typeof platformVersion === "string" &&
      platformVersion.trim() !== ""
        ? platformVersion.trim()
        : currentSettings.platformVersion;

    const newSettings = {
      platformName: cleanPlatformName,
      supportEmail: cleanSupportEmail,
      trialDurationDays: cleanTrialDurationDays,
      monthlySubscriptionPrice:
        cleanMonthlySubscriptionPrice,
      maxUsersPerCabinet: cleanMaxUsersPerCabinet,
      platformVersion: cleanPlatformVersion,
    };

    const settingsJson = JSON.stringify(newSettings);

    /* -----------------------------------------------------
       Vérification de la longueur

       Ta colonne maintenance.message est généralement
       VARCHAR(255).

       Si ton JSON dépasse 255 caractères, on évite une
       erreur SQL silencieuse.
    ----------------------------------------------------- */

    if (settingsJson.length > 255) {
      return res.status(400).json({
        success: false,
        error:
          "Les paramètres sont trop longs pour la colonne maintenance.message. Augmente sa taille à VARCHAR(1000) ou TEXT.",
      });
    }

    /* -----------------------------------------------------
       On supprime l'ancienne configuration puis on crée
       la nouvelle.

       Ainsi une seule configuration active est utilisée.
    ----------------------------------------------------- */

    await db.query(
      `DELETE FROM maintenance
       WHERE action = 'platform_settings'`
    );

    await db.query(
      `INSERT INTO maintenance
       (user_id, action, message, status)
       VALUES (?, ?, ?, ?)`,
      [
        null,
        "platform_settings",
        settingsJson,
        "info",
      ]
    );

    res.json({
      success: true,
      message: "Paramètres enregistrés avec succès",
      settings: newSettings,
    });
  } catch (err) {
    console.error(
      "Erreur PUT /api/cabinet/settings :",
      err
    );

    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   GET /api/cabinet

   Liste tous les cabinets avec leurs statistiques.
========================================================= */

router.get("/", async (req, res) => {
  try {
    await notifyExpiredSubscriptions();

    const [rows] = await db.query(`
      SELECT
        c.*,

        DATEDIFF(
          c.subscription_expires_at,
          NOW()
        ) AS daysRemaining,

        CASE
          WHEN c.subscription_expires_at IS NULL
            THEN NULL

          WHEN c.subscription_expires_at < NOW()
            THEN 0

          ELSE 1
        END AS isPaidUp,

        COALESCE(
          u.usersCount,
          0
        ) AS usersCount,

        COALESCE(
          cs.totalClients,
          0
        ) AS totalClients,

        COALESCE(
          cs.totalSales,
          0
        ) AS totalSales,

        CAST(
          COALESCE(
            cs.monthlyRevenue,
            0
          )
          AS DECIMAL(12,2)
        ) AS monthlyRevenue,

        COALESCE(
          pr.totalPrescriptions,
          0
        ) AS totalPrescriptions,

        CAST(
          COALESCE(
            p.stockValue,
            0
          )
          AS DECIMAL(12,2)
        ) AS stockValue

      FROM cabinet c

      /* =====================================================
         NOMBRE D'UTILISATEURS
      ===================================================== */

      LEFT JOIN (
        SELECT
          cabinet_id,
          COUNT(*) AS usersCount
        FROM app_user
        GROUP BY cabinet_id
      ) u
        ON u.cabinet_id = c.id

      /* =====================================================
         CLIENTS / VENTES / CHIFFRE D'AFFAIRES
      ===================================================== */

      LEFT JOIN (
        SELECT
          au.cabinet_id,

          COUNT(sa.id) AS totalSales,

          COUNT(
            DISTINCT sa.client_id
          ) AS totalClients,

          SUM(
            CASE
              WHEN MONTH(sa.date) = MONTH(CURDATE())
               AND YEAR(sa.date) = YEAR(CURDATE())
               AND sa.status IN ('paid', 'partial')
              THEN sa.total

              ELSE 0
            END
          ) AS monthlyRevenue

        FROM app_user au

        JOIN sale sa
          ON sa.user_id = au.id

        GROUP BY au.cabinet_id
      ) cs
        ON cs.cabinet_id = c.id

      /* =====================================================
         PRESCRIPTIONS
      ===================================================== */

      LEFT JOIN (
        SELECT
          au.cabinet_id,

          COUNT(
            DISTINCT pres.id
          ) AS totalPrescriptions

        FROM app_user au

        JOIN sale sa
          ON sa.user_id = au.id

        JOIN prescription pres
          ON pres.client_id = sa.client_id

        GROUP BY au.cabinet_id
      ) pr
        ON pr.cabinet_id = c.id

      /* =====================================================
         VALEUR DU STOCK
      ===================================================== */

      LEFT JOIN (
        SELECT
          cabinet_id,

          SUM(
            price * qty
          ) AS stockValue

        FROM product

        GROUP BY cabinet_id
      ) p
        ON p.cabinet_id = c.id

      ORDER BY c.createdAt DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(
      "Erreur GET /api/cabinet :",
      err
    );

    res.status(500).json({
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   POST /api/cabinet

   Création d'un cabinet.

   Le cabinet commence avec :
   subscription = pending
   validated = 0
========================================================= */

router.post("/", async (req, res) => {
  const {
    name,
    owner,
    ownerExerciseNumber,
    clinicExerciseNumber,
    authorizationNumber,
    email,
    phone,
    city,
    district,
    address,
  } = req.body;

  if (
    !name ||
    !owner ||
    !email ||
    !ownerExerciseNumber ||
    !authorizationNumber
  ) {
    return res.status(400).json({
      error: "Champs obligatoires manquants",
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO cabinet
      (
        name,
        owner,
        ownerExerciseNumber,
        clinicExerciseNumber,
        authorizationNumber,
        email,
        phone,
        city,
        district,
        address,
        subscription,
        validated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        name,
        owner,
        ownerExerciseNumber,
        clinicExerciseNumber || null,
        authorizationNumber,
        email,
        phone || null,
        city || null,
        district || null,
        address || null,
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: "Cabinet créé avec succès",
    });
  } catch (err) {
    console.error(
      "Erreur création cabinet :",
      err
    );

    res.status(500).json({
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   PATCH /api/cabinet/:id/validate

   Validation d'un cabinet.

   La durée d'essai est récupérée depuis les paramètres
   enregistrés dans maintenance.

   Exemple :
   trialDurationDays = 30

   => expiration dans 30 jours.
========================================================= */

router.patch("/:id/validate", async (req, res) => {
  try {
    const cabinetId = Number(req.params.id);

    if (!Number.isInteger(cabinetId) || cabinetId <= 0) {
      return res.status(400).json({
        error: "Identifiant cabinet invalide",
      });
    }

    /* -----------------------------------------------------
       Vérifier que le cabinet existe
    ----------------------------------------------------- */

    const [cabinetRows] = await db.query(
      `SELECT
         id,
         name,
         subscription,
         validated
       FROM cabinet
       WHERE id = ?`,
      [cabinetId]
    );

    if (cabinetRows.length === 0) {
      return res.status(404).json({
        error: "Cabinet introuvable",
      });
    }

    /* -----------------------------------------------------
       Récupérer les paramètres dynamiques
    ----------------------------------------------------- */

    const settings = await getPlatformSettings();

    const trialDays =
      Number(settings.trialDurationDays) > 0
        ? Number(settings.trialDurationDays)
        : DEFAULT_PLATFORM_SETTINGS.trialDurationDays;

    /* -----------------------------------------------------
       Validation + démarrage de l'essai
    ----------------------------------------------------- */

    await db.query(
      `UPDATE cabinet
       SET
         validated = 1,
         subscription = 'trial',
         subscription_expires_at =
           DATE_ADD(NOW(), INTERVAL ? DAY),
         expiry_notified_at = NULL
       WHERE id = ?`,
      [
        Math.floor(trialDays),
        cabinetId,
      ]
    );

    res.json({
      message: "Cabinet validé",
      trialDays: Math.floor(trialDays),
    });
  } catch (err) {
    console.error(
      "Erreur validation cabinet :",
      err
    );

    res.status(500).json({
      error: "Erreur serveur",
    });
  }
});

/* =========================================================
   PATCH /api/cabinet/:id/toggle-subscription

   Si active -> suspended

   Si suspended -> active

   Le SuperAdmin contrôle manuellement l'abonnement.
========================================================= */

router.patch(
  "/:id/toggle-subscription",
  async (req, res) => {
    try {
      const cabinetId = Number(req.params.id);

      if (
        !Number.isInteger(cabinetId) ||
        cabinetId <= 0
      ) {
        return res.status(400).json({
          error: "Identifiant cabinet invalide",
        });
      }

      const [rows] = await db.query(
        `SELECT
           id,
           subscription,
           subscription_expires_at
         FROM cabinet
         WHERE id = ?`,
        [cabinetId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: "Cabinet introuvable",
        });
      }

      const currentSubscription =
        rows[0].subscription;

      const next =
        currentSubscription === "active"
          ? "suspended"
          : "active";

      await db.query(
        `UPDATE cabinet
         SET subscription = ?
         WHERE id = ?`,
        [
          next,
          cabinetId,
        ]
      );

      res.json({
        message:
          next === "active"
            ? "Abonnement activé"
            : "Abonnement suspendu",

        subscription: next,
      });
    } catch (err) {
      console.error(
        "Erreur toggle-subscription :",
        err
      );

      res.status(500).json({
        error: "Erreur serveur",
      });
    }
  }
);

/* =========================================================
   POST /api/cabinet/:id/payments

   Enregistre un paiement d'abonnement.

   body :
   {
     amount,
     method,
     period_days
   }

   Si amount n'est pas fourni, le prix mensuel configuré
   dans les paramètres est utilisé.

   Si period_days n'est pas fourni :
   30 jours par défaut.
========================================================= */

router.post(
  "/:id/payments",
  async (req, res) => {
    const cabinetId = Number(req.params.id);

    const {
      amount,
      method,
      period_days,
    } = req.body;

    if (
      !Number.isInteger(cabinetId) ||
      cabinetId <= 0
    ) {
      return res.status(400).json({
        error: "Identifiant cabinet invalide",
      });
    }

    try {
      /* ---------------------------------------------------
         Vérifier le cabinet
      --------------------------------------------------- */

      const [rows] = await db.query(
        `SELECT
           id,
           subscription,
           subscription_expires_at
         FROM cabinet
         WHERE id = ?`,
        [cabinetId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: "Cabinet introuvable",
        });
      }

      /* ---------------------------------------------------
         Récupérer les paramètres
      --------------------------------------------------- */

      const settings =
        await getPlatformSettings();

      /* ---------------------------------------------------
         Montant

         Si le frontend envoie un montant valide,
         on l'utilise.

         Sinon on prend le prix mensuel configuré.
      --------------------------------------------------- */

      const configuredPrice =
        Number(
          settings.monthlySubscriptionPrice
        );

      const paymentAmount =
        amount !== undefined &&
        amount !== null &&
        amount !== "" &&
        Number(amount) > 0
          ? Number(amount)
          : configuredPrice;

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount <= 0
      ) {
        return res.status(400).json({
          error:
            "Le montant doit être supérieur à 0",
        });
      }

      /* ---------------------------------------------------
         Durée

         Par défaut 30 jours.
      --------------------------------------------------- */

      const periodDays =
        Number(period_days) > 0
          ? Math.floor(Number(period_days))
          : 30;

      /* ---------------------------------------------------
         Date d'expiration actuelle
      --------------------------------------------------- */

      const currentExpiry =
        rows[0].subscription_expires_at;

      const now = new Date();

      const expiryDate =
        currentExpiry
          ? new Date(currentExpiry)
          : null;

      const useCurrentExpiry =
        expiryDate &&
        !Number.isNaN(
          expiryDate.getTime()
        ) &&
        expiryDate > now;

      /* ---------------------------------------------------
         On utilise :

         - l'ancienne expiration si elle est encore valide ;
         - NOW() si elle est déjà expirée.
      --------------------------------------------------- */

      const baseDate =
        useCurrentExpiry
          ? "subscription_expires_at"
          : "NOW()";

      /* ---------------------------------------------------
         Mise à jour du cabinet
      --------------------------------------------------- */

      await db.query(
        `UPDATE cabinet
         SET
           subscription = 'active',

           subscription_expires_at =
             DATE_ADD(
               ${baseDate},
               INTERVAL ? DAY
             ),

           last_payment_at = NOW(),

           last_payment_amount = ?,

           expiry_notified_at = NULL

         WHERE id = ?`,
        [
          periodDays,
          paymentAmount,
          cabinetId,
        ]
      );

      /* ---------------------------------------------------
         Enregistrement du paiement
      --------------------------------------------------- */

      await db.query(
        `INSERT INTO cabinet_subscription_payment
        (
          cabinet_id,
          amount,
          method,
          period_days
        )
        VALUES (?, ?, ?, ?)`,
        [
          cabinetId,
          paymentAmount,
          method || null,
          periodDays,
        ]
      );

      /* ---------------------------------------------------
         Récupération du résultat
      --------------------------------------------------- */

      const [[updated]] =
        await db.query(
          `SELECT
             subscription,
             subscription_expires_at,
             last_payment_at,
             last_payment_amount,

             DATEDIFF(
               subscription_expires_at,
               NOW()
             ) AS daysRemaining

           FROM cabinet

           WHERE id = ?`,
          [cabinetId]
        );

      res.status(201).json({
        ...updated,
        amount: paymentAmount,
        period_days: periodDays,
      });
    } catch (err) {
      console.error(
        "Erreur paiement abonnement :",
        err
      );

      res.status(500).json({
        error: "Erreur serveur",
      });
    }
  }
);

/* =========================================================
   GET /api/cabinet/:id/payments

   Historique des paiements d'abonnement.
========================================================= */

router.get(
  "/:id/payments",
  async (req, res) => {
    try {
      const cabinetId =
        Number(req.params.id);

      if (
        !Number.isInteger(cabinetId) ||
        cabinetId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identifiant cabinet invalide",
        });
      }

      /* ---------------------------------------------------
         Vérifier que le cabinet existe
      --------------------------------------------------- */

      const [cabinetRows] =
        await db.query(
          `SELECT id
           FROM cabinet
           WHERE id = ?`,
          [cabinetId]
        );

      if (cabinetRows.length === 0) {
        return res.status(404).json({
          error: "Cabinet introuvable",
        });
      }

      /* ---------------------------------------------------
         Historique
      --------------------------------------------------- */

      const [rows] =
        await db.query(
          `SELECT
             id,
             amount,
             method,
             period_days,
             paid_at

           FROM cabinet_subscription_payment

           WHERE cabinet_id = ?

           ORDER BY paid_at DESC`,
          [cabinetId]
        );

      res.json(rows);
    } catch (err) {
      console.error(
        "Erreur historique paiements :",
        err
      );

      res.status(500).json({
        error: "Erreur serveur",
      });
    }
  }
);

/* =========================================================
   DELETE /api/cabinet/:id

   Suppression d'un cabinet.
========================================================= */

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const cabinetId =
        Number(req.params.id);

      if (
        !Number.isInteger(cabinetId) ||
        cabinetId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identifiant cabinet invalide",
        });
      }

      /* ---------------------------------------------------
         Vérifier l'existence
      --------------------------------------------------- */

      const [rows] =
        await db.query(
          `SELECT id
           FROM cabinet
           WHERE id = ?`,
          [cabinetId]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          error: "Cabinet introuvable",
        });
      }

      /* ---------------------------------------------------
         Suppression
      --------------------------------------------------- */

      await db.query(
        `DELETE FROM cabinet
         WHERE id = ?`,
        [cabinetId]
      );

      res.json({
        message:
          "Cabinet supprimé avec succès",
      });
    } catch (err) {
      console.error(
        "Erreur suppression cabinet :",
        err
      );

      res.status(500).json({
        error: "Erreur serveur",
      });
    }
  }
);

export default router;