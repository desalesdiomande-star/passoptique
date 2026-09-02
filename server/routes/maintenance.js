import express from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * =====================================================
 * AUTHENTIFICATION
 * =====================================================
 */
router.use(requireAuth);

/**
 * =====================================================
 * AUTORISATION SUPERADMIN
 * =====================================================
 */
const requireSuperAdmin = (req, res, next) => {
  const role = req.user?.role;

  if (role !== "superadmin" && role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Accès réservé au SuperAdmin",
    });
  }

  next();
};

router.use(requireSuperAdmin);

/**
 * =====================================================
 * OUTIL : récupérer le chemin de mysqldump
 * =====================================================
 *
 * Priorité :
 * 1. MYSQLDUMP_PATH dans .env
 * 2. mysqldump présent dans le PATH
 * 3. chemins classiques WAMP sous Windows
 *
 * Exemple .env :
 *
 * MYSQLDUMP_PATH=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqldump.exe
 *
 * Attention aux backslashes dans .env.
 */
const getMysqldumpCommand = () => {
  if (process.env.MYSQLDUMP_PATH) {
    return process.env.MYSQLDUMP_PATH;
  }

  if (process.platform === "win32") {
    const possiblePaths = [
      "C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.30\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.29\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.28\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.27\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.26\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.25\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql8.0.24\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql5.7.44\\bin\\mysqldump.exe",
      "C:\\wamp64\\bin\\mysql\\mysql5.7.36\\bin\\mysqldump.exe",
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  }

  return "mysqldump";
};

/**
 * =====================================================
 * GET /api/maintenance
 *
 * Récupération des opérations de maintenance
 * =====================================================
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        user_id,
        action,
        message,
        status,
        filename,
        file_path,
        file_size,
        created_at
      FROM maintenance
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return res.json(rows);
  } catch (error) {
    console.error(
      "[MAINTENANCE] Erreur récupération logs :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération de la maintenance",
      error: error.message,
    });
  }
});

/**
 * =====================================================
 * POST /api/maintenance/backup
 *
 * Création d'une vraie sauvegarde MySQL
 * =====================================================
 */
router.post("/backup", async (req, res) => {
  const userId = req.user?.id ?? null;

  let backupPath = null;
  let filename = null;
  let output = null;

  try {
    /**
     * -------------------------------------------------
     * Dossier backup
     * -------------------------------------------------
     */
    const backupDirectory = path.resolve("backups");

    if (!fs.existsSync(backupDirectory)) {
      fs.mkdirSync(backupDirectory, {
        recursive: true,
      });
    }

    /**
     * -------------------------------------------------
     * Nom du fichier
     * -------------------------------------------------
     */
    const now = new Date();

    const timestamp =
      `${now.getFullYear()}` +
      `${String(now.getMonth() + 1).padStart(2, "0")}` +
      `${String(now.getDate()).padStart(2, "0")}_` +
      `${String(now.getHours()).padStart(2, "0")}` +
      `${String(now.getMinutes()).padStart(2, "0")}` +
      `${String(now.getSeconds()).padStart(2, "0")}`;

    filename = `backup_${timestamp}.sql`;

    backupPath = path.join(
      backupDirectory,
      filename
    );

    /**
     * -------------------------------------------------
     * Configuration MySQL
     * -------------------------------------------------
     */
    const host =
      process.env.DB_HOST || "localhost";

    const port =
      process.env.DB_PORT || "3306";

    const user =
      process.env.DB_USER || "root";

    const password =
      process.env.DB_PASSWORD || "";

    const database =
      process.env.DB_NAME || "passoptique";

    /**
     * -------------------------------------------------
     * Vérification configuration
     * -------------------------------------------------
     */
    if (!database) {
      throw new Error(
        "Le nom de la base de données est manquant"
      );
    }

    /**
     * -------------------------------------------------
     * Chemin mysqldump
     * -------------------------------------------------
     */
    const mysqldumpCommand =
      getMysqldumpCommand();

    console.log(
      "[MAINTENANCE] mysqldump :",
      mysqldumpCommand
    );

    /**
     * -------------------------------------------------
     * Création du fichier
     * -------------------------------------------------
     */
    output = fs.createWriteStream(
      backupPath,
      {
        encoding: "utf8",
      }
    );

    /**
     * -------------------------------------------------
     * Arguments mysqldump
     * -------------------------------------------------
     */
    const args = [
      "-h",
      host,

      "-P",
      String(port),

      "-u",
      user,

      "--single-transaction",

      "--routines",

      "--triggers",

      "--events",

      database,
    ];

    /**
     * -------------------------------------------------
     * Lancement mysqldump
     * -------------------------------------------------
     */
    const mysqldump = spawn(
      mysqldumpCommand,
      args,
      {
        env: {
          ...process.env,

          /**
           * MYSQL_PWD évite de mettre le mot
           * de passe directement dans les arguments.
           */
          MYSQL_PWD: password,
        },

        windowsHide: true,
      }
    );

    let stderr = "";

    /**
     * -------------------------------------------------
     * STDERR
     * -------------------------------------------------
     */
    mysqldump.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    /**
     * -------------------------------------------------
     * STDOUT -> fichier
     * -------------------------------------------------
     */
    mysqldump.stdout.pipe(output);

    /**
     * -------------------------------------------------
     * Attendre mysqldump
     * -------------------------------------------------
     */
    await new Promise(
      (resolve, reject) => {
        let settled = false;

        const fail = (error) => {
          if (settled) return;

          settled = true;
          reject(error);
        };

        const success = () => {
          if (settled) return;

          settled = true;
          resolve();
        };

        mysqldump.on(
          "error",
          (error) => {
            fail(
              new Error(
                `Impossible de lancer mysqldump : ${error.message}`
              )
            );
          }
        );

        mysqldump.on(
          "close",
          (code) => {
            if (code === 0) {
              success();
            } else {
              fail(
                new Error(
                  stderr ||
                    `mysqldump a échoué avec le code ${code}`
                )
              );
            }
          }
        );
      }
    );

    /**
     * -------------------------------------------------
     * Attendre fermeture fichier
     * -------------------------------------------------
     */
    await new Promise(
      (resolve, reject) => {
        output.once(
          "finish",
          resolve
        );

        output.once(
          "error",
          reject
        );
      }
    );

    /**
     * -------------------------------------------------
     * Vérification fichier
     * -------------------------------------------------
     */
    if (
      !backupPath ||
      !fs.existsSync(backupPath)
    ) {
      throw new Error(
        "Le fichier de sauvegarde n'a pas été créé"
      );
    }

    /**
     * -------------------------------------------------
     * Taille fichier
     * -------------------------------------------------
     */
    const stats =
      fs.statSync(backupPath);

    if (stats.size === 0) {
      throw new Error(
        "Le fichier de sauvegarde est vide"
      );
    }

    /**
     * -------------------------------------------------
     * Enregistrement du log
     * -------------------------------------------------
     */
    await db.query(
      `
      INSERT INTO maintenance
      (
        user_id,
        action,
        message,
        status,
        filename,
        file_path,
        file_size
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,

        "backup",

        `Sauvegarde créée : ${filename}`,

        "success",

        filename,

        backupPath,

        stats.size,
      ]
    );

    console.log(
      `[MAINTENANCE] Sauvegarde créée : ${backupPath}`
    );

    /**
     * -------------------------------------------------
     * Réponse
     * -------------------------------------------------
     */
    return res.json({
      success: true,

      message:
        "Sauvegarde effectuée avec succès",

      filename,

      path: backupPath,

      size: stats.size,

      date: now.toISOString(),
    });
  } catch (error) {
    console.error(
      "[MAINTENANCE] Erreur sauvegarde :",
      error
    );

    /**
     * -------------------------------------------------
     * Fermer le stream si nécessaire
     * -------------------------------------------------
     */
    if (output) {
      try {
        output.destroy();
      } catch {
        // Rien
      }
    }

    /**
     * -------------------------------------------------
     * Supprimer fichier incomplet
     * -------------------------------------------------
     */
    if (
      backupPath &&
      fs.existsSync(backupPath)
    ) {
      try {
        fs.unlinkSync(backupPath);
      } catch (deleteError) {
        console.error(
          "[MAINTENANCE] Erreur suppression fichier :",
          deleteError
        );
      }
    }

    /**
     * -------------------------------------------------
     * Enregistrer erreur
     * -------------------------------------------------
     */
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

          "backup",

          `Échec de la sauvegarde : ${error.message}`,

          "error",
        ]
      );
    } catch (logError) {
      console.error(
        "[MAINTENANCE] Erreur enregistrement erreur :",
        logError
      );
    }

    return res.status(500).json({
      success: false,

      message:
        "Erreur lors de la sauvegarde",

      error: error.message,
    });
  }
});

/**
 * =====================================================
 * GET /api/maintenance/download/:filename
 *
 * Télécharger une sauvegarde
 * =====================================================
 */
router.get(
  "/download/:filename",
  async (req, res) => {
    try {
      const filename =
        req.params.filename;

      /**
       * Sécurité :
       * empêcher ../ ou chemins arbitraires
       */
      if (
        !filename ||
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        return res.status(400).json({
          success: false,
          message: "Nom de fichier invalide",
        });
      }

      const backupDirectory =
        path.resolve("backups");

      const filePath =
        path.join(
          backupDirectory,
          filename
        );

      /**
       * Vérification que le fichier existe
       */
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message:
            "Fichier de sauvegarde introuvable",
        });
      }

      /**
       * Vérifier que c'est bien un fichier
       */
      const stats =
        fs.statSync(filePath);

      if (!stats.isFile()) {
        return res.status(400).json({
          success: false,
          message: "Fichier invalide",
        });
      }

      /**
       * Télécharger
       */
      return res.download(
        filePath,
        filename
      );
    } catch (error) {
      console.error(
        "[MAINTENANCE] Erreur téléchargement :",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur lors du téléchargement",
        error: error.message,
      });
    }
  }
);

/**
 * =====================================================
 * POST /api/maintenance/cache/clear
 *
 * Journalise la demande de nettoyage du cache.
 *
 * Le cache navigateur est réellement supprimé
 * côté React.
 * =====================================================
 */
router.post(
  "/cache/clear",
  async (req, res) => {
    const userId =
      req.user?.id ?? null;

    try {
      /**
       * Empêcher la mise en cache
       */
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );

      res.setHeader(
        "Pragma",
        "no-cache"
      );

      res.setHeader(
        "Expires",
        "0"
      );

      /**
       * Log
       */
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

          "cache_clear",

          "Cache vidé par le SuperAdmin",

          "success",
        ]
      );

      return res.json({
        success: true,

        message:
          "Demande de vidage du cache effectuée",

        date:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[MAINTENANCE] Erreur cache :",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Erreur lors du vidage du cache",

        error: error.message,
      });
    }
  }
);

export default router;