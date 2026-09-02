import { db } from "../db.js";

/**
 * Crée une notification pour UN utilisateur.
 * @param {number} userId
 * @param {'glasses_ready'|'order_arrived'|'contact_client'|'stock_alert'} type
 * @param {string} message - déjà localisé (fr ou en) au moment de la création
 */
export async function createNotification(userId, type, message) {
  if (!userId) return;
  try {
    await db.query(
      `INSERT INTO notification (type, message, \`time\`, \`read\`, user_id)
       VALUES (?, ?, NOW(), 0, ?)`,
      [type, message, userId]
    );
  } catch (err) {
    // On ne bloque jamais l'action métier principale (vente, stock, etc.)
    // à cause d'un échec de notification : on log seulement.
    console.error("Erreur createNotification :", err);
  }
}

/**
 * Crée la même notification pour tous les utilisateurs actifs d'un cabinet.
 * Utile pour stock_alert / order_arrived où plusieurs employés doivent être avertis.
 * @param {number} cabinetId
 * @param {'glasses_ready'|'order_arrived'|'contact_client'|'stock_alert'} type
 * @param {string} message
 */
export async function createNotificationForCabinet(cabinetId, type, message) {
  if (!cabinetId) return;
  try {
    const [users] = await db.query(
      `SELECT id FROM app_user WHERE cabinet_id = ? AND active = 1`,
      [cabinetId]
    );
    if (users.length === 0) return;

    const values = users.map(u => [type, message, u.id]);
    await db.query(
      `INSERT INTO notification (type, message, \`time\`, \`read\`, user_id)
       VALUES ${values.map(() => "(?, ?, NOW(), 0, ?)").join(", ")}`,
      values.flat()
    );
  } catch (err) {
    console.error("Erreur createNotificationForCabinet :", err);
  }
}