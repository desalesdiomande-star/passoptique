import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
//https://passoptique-backend.onrender.com
dotenv.config();

// =========================================================
// SSL
//
// Aiven exige une connexion chiffrée. Le certificat CA
// (téléchargé depuis l'onglet "Overview" du service Aiven)
// doit être déposé sur le serveur Render via la fonctionnalité
// "Secret Files" (Render dashboard > ton service > Environment
// > Secret Files), monté par exemple à /etc/secrets/aiven-ca.pem.
//
// DB_SSL_CA_PATH doit alors valoir : /etc/secrets/aiven-ca.pem
//
// En local (WAMP, sans SSL), laisse DB_SSL_CA_PATH vide dans ton
// .env local : la connexion se fera alors sans SSL, comme avant.
// =========================================================

const sslConfig = process.env.DB_SSL_CA_PATH
  ? {
      ca: fs.readFileSync(process.env.DB_SSL_CA_PATH),
      rejectUnauthorized: true,
    }
  : undefined;

// =========================================================
// POOL
//
// Contrairement à un contexte serverless (Vercel), Render fait
// tourner un seul processus Node en continu : un pool classique
// avec une limite raisonnable de connexions convient parfaitement
// (pas besoin de le limiter à 1 comme on l'aurait fait en serverless).
// =========================================================

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});