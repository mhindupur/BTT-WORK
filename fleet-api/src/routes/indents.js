import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin, requireSiteManager } from "../middleware/auth.js";

const upload = multer({ dest: path.join(process.env.UPLOAD_DIR || "./uploads", "indents") });

const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get("/", async (_req, res) => {
  const rows = await query(
    `SELECT i.*, v.registration_number, u.full_name AS site_manager_name
     FROM indents i
     JOIN vehicles v ON v.id = i.vehicle_id
     JOIN site_managers sm ON sm.id = i.site_manager_id
     JOIN users u ON u.id = sm.user_id
     ORDER BY i.id DESC LIMIT 500`
  );
  res.json(rows);
});

admin.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "utilized", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  await execute("UPDATE indents SET status = ? WHERE id = ?", [status, req.params.id]);
  const row = await queryOne("SELECT * FROM indents WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

const sm = Router();
sm.use(requireAuth, requireSiteManager);

sm.get("/mine", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const rows = await query(
    `SELECT i.*, v.registration_number FROM indents i
     JOIN vehicles v ON v.id = i.vehicle_id
     WHERE i.site_manager_id = ?
     ORDER BY i.id DESC LIMIT 200`,
    [smRow.id]
  );
  res.json(rows);
});

sm.post("/", upload.single("photo"), async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const { serial_number, vehicle_id, amount_rs } = req.body || {};
  if (!serial_number || !vehicle_id || amount_rs == null) {
    return res.status(400).json({ error: "serial_number, vehicle_id, amount_rs required" });
  }
  const access = await queryOne(
    "SELECT 1 FROM vehicle_site_managers WHERE vehicle_id = ? AND site_manager_id = ?",
    [vehicle_id, smRow.id]
  );
  if (!access) return res.status(403).json({ error: "Vehicle not assigned to you" });
  const dup = await queryOne("SELECT id FROM indents WHERE serial_number = ?", [serial_number]);
  if (dup) return res.status(409).json({ error: "Serial number already used" });
  const imagePath = req.file ? `/uploads/indents/${req.file.filename}` : null;
  const result = await execute(
    `INSERT INTO indents (serial_number, vehicle_id, site_manager_id, amount_rs, status, image_path)
     VALUES (?,?,?,?, 'pending', ?)`,
    [serial_number, vehicle_id, smRow.id, Number(amount_rs), imagePath]
  );
  const row = await queryOne("SELECT * FROM indents WHERE id = ?", [result.insertId]);
  res.status(201).json(row);
});

export { admin as indentsAdmin, sm as indentsSm };
