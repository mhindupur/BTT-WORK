import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin, requireSiteManager } from "../middleware/auth.js";
import { notifyAdmin } from "../services/notifications.js";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const driverDocDir = path.join(uploadRoot, "drivers");
fs.mkdirSync(driverDocDir, { recursive: true });

const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, driverDocDir),
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || "dl").replace(/[^\w.\-]+/g, "_").slice(0, 80);
      cb(null, `${Date.now()}_${safe}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const DRIVER_ROW = `SELECT d.*, c.name AS client_name, c.site_code,
  v.registration_number AS vehicle_registration
 FROM drivers d
 JOIN clients c ON c.id = d.client_id
 LEFT JOIN vehicles v ON v.id = d.vehicle_id`;

function pickDriverFields(body, existing = {}) {
  const out = {
    client_id: existing.client_id ?? null,
    vehicle_id: existing.vehicle_id ?? null,
    full_name: existing.full_name ?? null,
    phone: existing.phone ?? null,
    license_number: existing.license_number ?? null,
    license_expiry: existing.license_expiry ?? null,
    is_active: existing.is_active != null ? Number(existing.is_active) : 1,
    notes: existing.notes ?? null,
  };
  if (body.client_id != null && body.client_id !== "") out.client_id = Number(body.client_id);
  if (Object.prototype.hasOwnProperty.call(body, "vehicle_id")) {
    out.vehicle_id = body.vehicle_id === "" || body.vehicle_id == null ? null : Number(body.vehicle_id);
  }
  if (body.full_name != null) out.full_name = String(body.full_name).trim();
  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    out.phone = body.phone === "" || body.phone == null ? null : String(body.phone).trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "license_number")) {
    out.license_number =
      body.license_number === "" || body.license_number == null
        ? null
        : String(body.license_number).trim().toUpperCase();
  }
  if (Object.prototype.hasOwnProperty.call(body, "license_expiry")) {
    out.license_expiry =
      body.license_expiry === "" || body.license_expiry == null
        ? null
        : String(body.license_expiry).slice(0, 10);
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    out.is_active = body.is_active ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    out.notes = body.notes === "" || body.notes == null ? null : String(body.notes);
  }
  return out;
}

export const driversAdmin = Router();
driversAdmin.use(requireAuth, requireAdmin);

driversAdmin.get("/", async (_req, res) => {
  const rows = await query(`${DRIVER_ROW} ORDER BY d.full_name ASC, d.id DESC`);
  res.json(rows);
});

driversAdmin.post("/", async (req, res) => {
  const f = pickDriverFields(req.body || {});
  if (!f.client_id) return res.status(400).json({ error: "Site is required" });
  if (!f.full_name) return res.status(400).json({ error: "Driver name is required" });
  const client = await queryOne("SELECT id FROM clients WHERE id = ?", [f.client_id]);
  if (!client) return res.status(404).json({ error: "Site not found" });
  if (f.vehicle_id) {
    const veh = await queryOne("SELECT id FROM vehicles WHERE id = ? AND client_id = ?", [
      f.vehicle_id,
      f.client_id,
    ]);
    if (!veh) return res.status(400).json({ error: "Vehicle must belong to the selected site" });
  }
  const ins = await execute(
    `INSERT INTO drivers (client_id, vehicle_id, full_name, phone, license_number, license_expiry, is_active, notes)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      f.client_id,
      f.vehicle_id,
      f.full_name,
      f.phone,
      f.license_number,
      f.license_expiry,
      f.is_active,
      f.notes,
    ]
  );
  res.status(201).json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [ins.insertId]));
});

driversAdmin.patch("/:id", async (req, res) => {
  const existing = await queryOne("SELECT * FROM drivers WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const f = pickDriverFields(req.body || {}, existing);
  if (!f.full_name) return res.status(400).json({ error: "Driver name is required" });
  if (f.vehicle_id) {
    const veh = await queryOne("SELECT id FROM vehicles WHERE id = ? AND client_id = ?", [
      f.vehicle_id,
      f.client_id,
    ]);
    if (!veh) return res.status(400).json({ error: "Vehicle must belong to the selected site" });
  }
  await execute(
    `UPDATE drivers SET client_id=?, vehicle_id=?, full_name=?, phone=?, license_number=?,
      license_expiry=?, is_active=?, notes=? WHERE id=?`,
    [
      f.client_id,
      f.vehicle_id,
      f.full_name,
      f.phone,
      f.license_number,
      f.license_expiry,
      f.is_active,
      f.notes,
      existing.id,
    ]
  );
  res.json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [existing.id]));
});

driversAdmin.post("/:id/approve-license", async (req, res) => {
  const row = await queryOne("SELECT * FROM drivers WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.license_doc_status !== "pending") {
    return res.status(400).json({ error: "No pending driving license to approve" });
  }
  const newExpiry = row.license_expiry_pending || row.license_expiry;
  await execute(
    `UPDATE drivers SET license_doc_status='approved', license_expiry=?, license_expiry_pending=NULL,
      license_rejection_note=NULL WHERE id=?`,
    [newExpiry, row.id]
  );
  res.json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [row.id]));
});

driversAdmin.post("/:id/reject-license", async (req, res) => {
  const row = await queryOne("SELECT * FROM drivers WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const note = String(req.body?.rejection_note || "").trim();
  if (!note) return res.status(400).json({ error: "rejection_note required" });
  await execute(
    `UPDATE drivers SET license_doc_status='rejected', license_expiry_pending=NULL, license_rejection_note=? WHERE id=?`,
    [note, row.id]
  );
  res.json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [row.id]));
});

export const driversSm = Router();
driversSm.use(requireAuth, requireSiteManager);

async function smProfile(userId) {
  return queryOne(
    `SELECT sm.id, sm.client_id, u.full_name, u.phone
     FROM site_managers sm JOIN users u ON u.id = sm.user_id WHERE sm.user_id = ?`,
    [userId]
  );
}

driversSm.get("/mine", async (req, res) => {
  const sm = await smProfile(req.user.id);
  if (!sm) return res.status(400).json({ error: "Site manager profile missing" });
  const rows = await query(`${DRIVER_ROW} WHERE d.client_id = ? ORDER BY d.full_name ASC`, [
    sm.client_id,
  ]);
  res.json(rows);
});

driversSm.post("/", async (req, res) => {
  const sm = await smProfile(req.user.id);
  if (!sm) return res.status(400).json({ error: "Site manager profile missing" });
  const f = pickDriverFields({ ...req.body, client_id: sm.client_id });
  if (!f.full_name) return res.status(400).json({ error: "Driver name is required" });
  if (f.vehicle_id) {
    const veh = await queryOne("SELECT id FROM vehicles WHERE id = ? AND client_id = ?", [
      f.vehicle_id,
      sm.client_id,
    ]);
    if (!veh) return res.status(400).json({ error: "Vehicle must belong to your site" });
  }
  const ins = await execute(
    `INSERT INTO drivers (client_id, vehicle_id, full_name, phone, license_number, license_expiry, is_active, notes)
     VALUES (?,?,?,?,?,?,1,?)`,
    [sm.client_id, f.vehicle_id, f.full_name, f.phone, f.license_number, f.license_expiry, f.notes]
  );
  res.status(201).json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [ins.insertId]));
});

driversSm.patch("/:id", async (req, res) => {
  const sm = await smProfile(req.user.id);
  if (!sm) return res.status(400).json({ error: "Site manager profile missing" });
  const existing = await queryOne("SELECT * FROM drivers WHERE id = ? AND client_id = ?", [
    req.params.id,
    sm.client_id,
  ]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const f = pickDriverFields({ ...req.body, client_id: sm.client_id }, existing);
  if (!f.full_name) return res.status(400).json({ error: "Driver name is required" });
  if (f.vehicle_id) {
    const veh = await queryOne("SELECT id FROM vehicles WHERE id = ? AND client_id = ?", [
      f.vehicle_id,
      sm.client_id,
    ]);
    if (!veh) return res.status(400).json({ error: "Vehicle must belong to your site" });
  }
  await execute(
    `UPDATE drivers SET vehicle_id=?, full_name=?, phone=?, license_number=?, license_expiry=?, notes=?
     WHERE id=?`,
    [f.vehicle_id, f.full_name, f.phone, f.license_number, f.license_expiry, f.notes, existing.id]
  );
  res.json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [existing.id]));
});

driversSm.post("/:id/license-document", uploadDoc.single("file"), async (req, res) => {
  const sm = await smProfile(req.user.id);
  if (!sm) return res.status(400).json({ error: "Site manager profile missing" });
  const existing = await queryOne("SELECT * FROM drivers WHERE id = ? AND client_id = ?", [
    req.params.id,
    sm.client_id,
  ]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!req.file) return res.status(400).json({ error: "file required" });
  const expiry = req.body?.license_expiry ? String(req.body.license_expiry).slice(0, 10) : null;
  if (!expiry) return res.status(400).json({ error: "license_expiry required" });
  const relPath = path.join("drivers", req.file.filename);
  // Keep current license_expiry until admin approves — reminders continue until then.
  await execute(
    `UPDATE drivers SET license_expiry_pending=?, license_doc_status='pending', license_doc_path=?,
      license_doc_original_filename=?, license_rejection_note=NULL WHERE id=?`,
    [expiry, relPath, req.file.originalname || req.file.filename, existing.id]
  );
  await notifyAdmin({
    type: "driver_license_pending",
    title: `Driving license pending — ${existing.full_name}`,
    body: `Site manager uploaded renewed DL (pending approval). New expiry ${expiry}.`,
    entityType: "driver",
    entityId: existing.id,
  });
  res.status(201).json(await queryOne(`${DRIVER_ROW} WHERE d.id = ?`, [existing.id]));
});
