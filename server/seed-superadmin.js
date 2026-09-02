import bcrypt from "bcrypt";
import { db } from "./db.js";

const SUPERADMIN = {
  name: "Super Admin",
  email: "superadmin@passoptique.ci",
  password: "super123", // change-le avant d'exécuter
  role: "superadmin",
};

const PLATFORM_CABINET_NAME = "PASS OPTIQUE Platform";

const seedSuperAdmin = async () => {
  // 1. Trouver ou créer le cabinet "plateforme" réservé au superadmin
  let cabinetId;
  const [cabinets] = await db.query("SELECT id FROM cabinet WHERE name = ?", [PLATFORM_CABINET_NAME]);

  if (cabinets.length > 0) {
    cabinetId = cabinets[0].id;
  } else {
    const [result] = await db.query("INSERT INTO cabinet (name) VALUES (?)", [PLATFORM_CABINET_NAME]);
    cabinetId = result.insertId;
  }

  // 2. Créer ou mettre à jour le superadmin
  const [existing] = await db.query("SELECT id FROM app_user WHERE email = ?", [SUPERADMIN.email]);
  const hashedPassword = await bcrypt.hash(SUPERADMIN.password, 10);

  if (existing.length > 0) {
    await db.query(
      "UPDATE app_user SET name = ?, password = ?, role = ?, active = 1, cabinet_id = ? WHERE email = ?",
      [SUPERADMIN.name, hashedPassword, SUPERADMIN.role, cabinetId, SUPERADMIN.email]
    );
    console.log(`Superadmin mis à jour : ${SUPERADMIN.email}`);
  } else {
    await db.query(
      "INSERT INTO app_user (name, email, password, role, active, cabinet_id) VALUES (?, ?, ?, ?, 1, ?)",
      [SUPERADMIN.name, SUPERADMIN.email, hashedPassword, SUPERADMIN.role, cabinetId]
    );
    console.log(`Superadmin créé : ${SUPERADMIN.email}`);
  }

  process.exit(0);
};

seedSuperAdmin().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});