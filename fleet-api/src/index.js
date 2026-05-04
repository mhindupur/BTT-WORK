import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import auth from "./routes/auth.js";
import clients from "./routes/clients.js";
import siteManagers from "./routes/siteManagers.js";
import { vehiclesAdmin, vehiclesSm } from "./routes/vehicles.js";
import { indentsAdmin, indentsSm } from "./routes/indents.js";
import fuel from "./routes/fuel.js";
import { paymentsAdmin, paymentsPublic } from "./routes/payments.js";
import dashboard from "./routes/dashboard.js";
import indentBatches from "./routes/indentBatches.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");

for (const sub of ["indents", "fuel"]) {
  fs.mkdirSync(path.join(uploadRoot, sub), { recursive: true });
}

app.use(
  cors({
    origin: process.env.PUBLIC_WEB_ORIGIN?.split(",") || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadRoot));

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "btt-fleet-api" }));

app.use("/api/auth", auth);
app.use("/api/clients", clients);
app.use("/api/site-managers", siteManagers);
app.use("/api/admin/vehicles", vehiclesAdmin);
app.use("/api/sm/vehicles", vehiclesSm);
app.use("/api/admin/indents", indentsAdmin);
app.use("/api/admin/indent-batches", indentBatches);
app.use("/api/sm/indents", indentsSm);
app.use("/api/admin/fuel", fuel);
app.use("/api/admin/payments", paymentsAdmin);
app.use("/api/public/payments", paymentsPublic);
app.use("/api/admin/dashboard", dashboard);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`BTT Fleet API http://127.0.0.1:${PORT}`);
});
