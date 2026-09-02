import bcrypt from "bcrypt";
import { db } from "./db.js";

const migratePasswords = async () => {
  const [users] = await db.query("SELECT id, email, password FROM app_user");

  for (const user of users) {
    if (user.password.startsWith("$2")) {
      console.log(`Ignoré (déjà haché) : ${user.email}`);
      continue;
    }

    const hashed = await bcrypt.hash(user.password, 10);
    await db.query("UPDATE app_user SET password = ? WHERE id = ?", [hashed, user.id]);
    console.log(`Migré : ${user.email}`);
  }

  console.log("Migration terminée.");
  process.exit(0);
};

migratePasswords().catch((err) => {
  console.error("Erreur pendant la migration :", err);
  process.exit(1);
});