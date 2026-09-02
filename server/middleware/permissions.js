import { db } from "../db.js";

const permissionsCache = { data: null, expiresAt: 0 };
const CACHE_TTL = 30_000; // 30s

const loadPermissions = async () => {
  if (permissionsCache.data && Date.now() < permissionsCache.expiresAt) {
    return permissionsCache.data;
  }
  const [rows] = await db.query("SELECT module, role, enabled FROM role_permission");
  const map = {};
  for (const row of rows) {
    map[`${row.module}:${row.role}`] = !!row.enabled;
  }
  permissionsCache.data = map;
  permissionsCache.expiresAt = Date.now() + CACHE_TTL;
  return map;
};

export const requirePermission = (module) => {
  return async (req, res, next) => {
    if (req.user?.role === "superadmin") return next();
    try {
      const map = await loadPermissions();
      const allowed = map[`${module}:${req.user?.role}`];
      if (allowed) return next();
      return res.status(403).json({ error: "Accès refusé à ce module" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur de vérification des permissions" });
    }
  };
};

export const invalidatePermissionsCache = () => {
  permissionsCache.data = null;
  permissionsCache.expiresAt = 0;
};