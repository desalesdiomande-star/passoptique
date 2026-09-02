import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { invalidatePermissionsCache } from "../middleware/permissions.js";

const router = Router();

const MODULES = [
  "dashboard", "clients", "prescriptions", "sales", "stock",
  "payments", "orders", "invoices", "reports", "statistics",
  "settings", "notifications",
];
const ROLES = ["admin", "directeur", "vendeur", "caissier"];

// GET /api/permissions -> matrice complète (une ligne par module)
router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT module, role, enabled FROM role_permission");

    const map = {};
    for (const m of MODULES) map[m] = { module: m };
    for (const row of rows) {
      if (!map[row.module]) map[row.module] = { module: row.module };
      map[row.module][row.role] = !!row.enabled;
    }
    const result = MODULES.map((m) => {
      const entry = map[m];
      for (const r of ROLES) if (!(r in entry)) entry[r] = false;
      return entry;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du chargement des permissions" });
  }
});

// PUT /api/permissions -> sauvegarde en masse (superadmin uniquement)
router.put("/", requireAuth, requireRole("superadmin"), async (req, res) => {
  const { permissions } = req.body; // [{ module, admin, directeur, vendeur, caissier }]
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: "Format invalide" });
  }

  try {
    const values = [];
    for (const row of permissions) {
      for (const role of ROLES) {
        values.push([row.module, role, row[role] ? 1 : 0]);
      }
    }
    await db.query(
      `INSERT INTO role_permission (module, role, enabled) VALUES ?
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      [values]
    );
    invalidatePermissionsCache();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde des permissions" });
  }
});

export default router;