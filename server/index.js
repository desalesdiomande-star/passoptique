import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import cabinetRoutes from "./routes/cabinet.js";
import clientsRoutes from "./routes/clients.js";
import monthlyGrowthRoutes from "./routes/stats/monthly-growth.js";
import systemLogsRoutes from "./routes/stats/system-logs.js";
import dashboardRoutes from "./routes/dashboard.js";
import prescriptionsRoutes from "./routes/prescriptions.js";
import productsRoutes from "./routes/products.js";
import paymentsRoutes from "./routes/payments.js";
import salesRoutes from "./routes/sales.js";
import invoicesRoutes from "./routes/invoices.js";
import reportsRoutes from "./routes/reports.js";
import statisticsRouter from "./routes/statistics.js";
import shopRouter from "./routes/shop.js";
import notificationsRouter from "./routes/notifications.js";
import permissionsRoutes from "./routes/permissions.js";
import maintenanceRoutes from "./routes/maintenance.js";
import usersRoutes from "./routes/users.js";
import settingsRoutes from "./routes/settings.js";

dotenv.config();

const app = express();

// =========================================================
// CORS
//
// Frontend (Vercel) et backend (Render) sont sur deux domaines
// différents en production : il faut autoriser explicitement
// l'origine du frontend, sinon le navigateur bloque les requêtes
// malgré un serveur qui répond correctement.
//
// FRONTEND_URL est défini dans les variables d'environnement
// de Render (PAS ici dans le code). Il peut contenir plusieurs
// origines séparées par une virgule, pratique pour autoriser à
// la fois ton URL Vercel de prod et localhost en dev :
//
//   FRONTEND_URL=https://passoptique.vercel.app,http://localhost:8080
//
// On normalise chaque origine (trim + suppression d'un éventuel
// "/" final) car le header Origin envoyé par le navigateur n'a
// jamais de slash final, et une variable mal configurée avec un
// slash casserait silencieusement la comparaison exacte de cors.
// =========================================================

const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:8080"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/cabinet", cabinetRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/cabinet/stats/monthly-growth", monthlyGrowthRoutes);
app.use("/api/cabinet/stats/system-logs", systemLogsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/prescriptions", prescriptionsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/statistics", statisticsRouter);
app.use("/api/shop", shopRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/settings", settingsRoutes);

// =========================================================
// PORT
//
// Render injecte automatiquement la variable PORT et attend que
// le service écoute dessus — impossible de choisir son propre
// port en production. SERVER_PORT reste dispo pour du dev local.
// =========================================================

const PORT = process.env.PORT || process.env.SERVER_PORT || 4000;

app.listen(PORT, () =>
  console.log(`Serveur backend sur http://localhost:${PORT}`)
);