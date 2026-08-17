import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin, requireSiteManager } from "../middleware/auth.js";
import { normalizeVehicleRegistration } from "../utils/vehicleReg.js";
import { assertVehicleSla, SLA_SELECT } from "../utils/vehicleSla.js";
import { isValidDocType, VEHICLE_DOC_TYPES, DOC_TYPE_VEHICLE_DATE } from "../constants/vehicleDocs.js";
import { notifyAdmin } from "../services/notifications.js";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const vehicleDocDir = path.join(uploadRoot, "vehicles");
fs.mkdirSync(vehicleDocDir, { recursive: true });

const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, vehicleDocDir),
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || "doc").replace(/[^\w.\-]+/g, "_").slice(0, 80);
      cb(null, `${Date.now()}_${safe}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const VEHICLE_ADMIN_ROW = `SELECT v.*, c.name AS client_name, ${SLA_SELECT}, vt.name AS vehicle_type_name,
  (SELECT GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR ', ') FROM vehicle_site_managers vsm
    JOIN site_managers sm ON sm.id = vsm.site_manager_id
    JOIN users u ON u.id = sm.user_id WHERE vsm.vehicle_id = v.id) AS site_manager_names,
  (SELECT MIN(vsm2.site_manager_id) FROM vehicle_site_managers vsm2 WHERE vsm2.vehicle_id = v.id) AS site_manager_id,
  (SELECT u2.full_name FROM site_managers sm2 JOIN users u2 ON u2.id = sm2.user_id
    WHERE sm2.id = v.submitted_by_site_manager_id) AS submitted_by_name,
  (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id) AS doc_count,
  (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.status = 'pending') AS pending_doc_count
 FROM vehicles v JOIN clients c ON c.id = v.client_id
 LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id`;

async function resolveVehicleType(body, existing = {}) {
  let typeId =
    body.vehicle_type_id != null && body.vehicle_type_id !== ""
      ? Number(body.vehicle_type_id)
      : existing.vehicle_type_id != null
        ? Number(existing.vehicle_type_id)
        : null;
  if (Object.prototype.hasOwnProperty.call(body, "vehicle_type_id") && (body.vehicle_type_id === "" || body.vehicle_type_id == null)) {
    typeId = null;
  }
  let makeModel = existing.make_model ?? null;
  if (Object.prototype.hasOwnProperty.call(body, "make_model")) {
    makeModel = body.make_model === "" || body.make_model == null ? null : String(body.make_model);
  }
  if (typeId) {
    const t = await queryOne("SELECT id, name FROM vehicle_types WHERE id = ? AND is_active = 1", [typeId]);
    if (!t) return { error: "Invalid vehicle type", status: 400 };
    typeId = t.id;
    makeModel = t.name;
  }
  return { vehicle_type_id: typeId, make_model: makeModel };
}

const VEHICLE_STRING_FIELDS = [
  "owner_name",
  "owner_phone",
  "ownership",
  "make_model",
  "fuel_type",
  "sub_vendor",
  "engine_number",
  "chassis_number",
  "ac_type",
  "gps_imei",
  "gps_vendor",
  "insurance_expiry",
  "fitness_expiry",
  "puc_expiry",
  "tax_expiry",
  "permit_expiry",
  "form_42_47_expiry",
  "form_49_expiry",
  "attach_date",
  "registration_date",
  "notes",
];

const VEHICLE_INSERT_COLS = `owner_name, owner_phone, ownership, make_model, vehicle_type_id, fuel_type,
  seating_capacity, registration_date, manufacture_year, attach_date, sub_vendor, engine_number, chassis_number, ac_type,
  gps_installed, gps_imei, gps_vendor,
  insurance_expiry, fitness_expiry, puc_expiry, tax_expiry, permit_expiry, form_42_47_expiry, form_49_expiry`;

function vehicleFieldValues(f, typeRes) {
  return [
    f.owner_name,
    f.owner_phone,
    f.ownership,
    typeRes.make_model,
    typeRes.vehicle_type_id,
    f.fuel_type,
    f.seating_capacity,
    f.registration_date,
    f.manufacture_year,
    f.attach_date,
    f.sub_vendor,
    f.engine_number,
    f.chassis_number,
    f.ac_type,
    f.gps_installed,
    f.gps_imei,
    f.gps_vendor,
    f.insurance_expiry,
    f.fitness_expiry,
    f.puc_expiry,
    f.tax_expiry,
    f.permit_expiry,
    f.form_42_47_expiry,
    f.form_49_expiry,
  ];
}

function pickVehicleFields(body, existing = {}) {
  const out = {
    owner_name: existing.owner_name ?? null,
    owner_phone: existing.owner_phone ?? null,
    ownership: existing.ownership ?? null,
    make_model: existing.make_model ?? null,
    fuel_type: existing.fuel_type ?? null,
    seating_capacity: existing.seating_capacity ?? null,
    registration_date: existing.registration_date ?? null,
    manufacture_year: existing.manufacture_year ?? null,
    attach_date: existing.attach_date ?? null,
    sub_vendor: existing.sub_vendor ?? null,
    engine_number: existing.engine_number ?? null,
    chassis_number: existing.chassis_number ?? null,
    ac_type: existing.ac_type ?? null,
    gps_installed: existing.gps_installed != null ? Number(existing.gps_installed) : 0,
    gps_imei: existing.gps_imei ?? null,
    gps_vendor: existing.gps_vendor ?? null,
    insurance_expiry: existing.insurance_expiry ?? null,
    fitness_expiry: existing.fitness_expiry ?? null,
    puc_expiry: existing.puc_expiry ?? null,
    tax_expiry: existing.tax_expiry ?? null,
    permit_expiry: existing.permit_expiry ?? null,
    form_42_47_expiry: existing.form_42_47_expiry ?? null,
    form_49_expiry: existing.form_49_expiry ?? null,
    notes: existing.notes ?? null,
    is_active: existing.is_active != null ? Number(existing.is_active) : 1,
  };
  for (const k of VEHICLE_STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      out[k] = v === "" || v == null ? null : String(v);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "manufacture_year")) {
    const y = body.manufacture_year;
    if (y === "" || y == null) out.manufacture_year = null;
    else {
      const n = Number(y);
      out.manufacture_year = Number.isFinite(n) ? n : null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "seating_capacity")) {
    const s = body.seating_capacity;
    if (s === "" || s == null) out.seating_capacity = null;
    else {
      const n = Number(s);
      out.seating_capacity = Number.isFinite(n) && n >= 1 && n <= 55 ? n : null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "gps_installed")) {
    out.gps_installed = body.gps_installed === true || body.gps_installed === 1 || body.gps_installed === "1" ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    out.is_active = body.is_active ? 1 : 0;
  }
  return out;
}

async function listDocs(vehicleId) {
  return query(
    `SELECT vd.*, u.full_name AS uploaded_by_name
     FROM vehicle_documents vd
     LEFT JOIN users u ON u.id = vd.uploaded_by_user_id
     WHERE vd.vehicle_id = ?
     ORDER BY vd.doc_type, vd.id DESC`,
    [vehicleId]
  );
}

async function assertSmBelongsToClient(siteManagerIds, clientId) {
  for (const smid of siteManagerIds) {
    const sm = await queryOne("SELECT id, client_id FROM site_managers WHERE id = ?", [smid]);
    if (!sm) return { error: "Site manager not found", status: 404 };
    if (Number(sm.client_id) !== Number(clientId)) {
      return { error: "Site manager must belong to the selected client", status: 400 };
    }
  }
  return null;
}

async function smCanAccessVehicle(smId, vehicleId) {
  const v = await queryOne("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
  if (!v) return { error: "Not found", status: 404 };
  if (Number(v.submitted_by_site_manager_id) === Number(smId)) return { vehicle: v };
  const link = await queryOne(
    "SELECT 1 FROM vehicle_site_managers WHERE vehicle_id = ? AND site_manager_id = ?",
    [vehicleId, smId]
  );
  if (!link) return { error: "Vehicle not assigned to you", status: 403 };
  return { vehicle: v };
}

async function allocateVehicleSerial(clientId) {
  const c = await queryOne("SELECT site_code FROM clients WHERE id = ?", [clientId]);
  const code = String(c?.site_code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  if (code.length !== 5) {
    return { error: "Site must have a 5-character unique code (e.g. INFNG) before adding vehicles", status: 400 };
  }
  const rows = await query("SELECT vehicle_serial FROM vehicles WHERE client_id = ? AND vehicle_serial LIKE ?", [
    clientId,
    `${code}%`,
  ]);
  let maxN = 0;
  const re = new RegExp(`^${code}(\\d+)$`);
  for (const row of rows) {
    const m = String(row.vehicle_serial || "").match(re);
    if (m) maxN = Math.max(maxN, Number(m[1]));
  }
  return { serial: `${code}${String(maxN + 1).padStart(4, "0")}` };
}

const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get("/", async (req, res) => {
  const status = String(req.query.approval_status || "").trim();
  let sql = `${VEHICLE_ADMIN_ROW}`;
  const params = [];
  if (status) {
    sql += ` WHERE v.approval_status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY v.id DESC`;
  res.json(await query(sql, params));
});

admin.get("/pending-review", async (_req, res) => {
  res.json(
    await query(
      `${VEHICLE_ADMIN_ROW} WHERE v.approval_status = 'pending_review' ORDER BY v.submitted_at DESC, v.id DESC`
    )
  );
});

admin.get("/:id/documents", async (req, res) => {
  const v = await queryOne("SELECT id FROM vehicles WHERE id = ?", [req.params.id]);
  if (!v) return res.status(404).json({ error: "Not found" });
  res.json(await listDocs(req.params.id));
});

admin.post("/", async (req, res) => {
  const { client_id, registration_number, site_manager_id, site_manager_ids } = req.body || {};
  if (!client_id) return res.status(400).json({ error: "client_id required" });
  const cid = Number(client_id);
  if (registration_number == null || String(registration_number).trim() === "") {
    return res.status(400).json({ error: "Vehicle registration is required" });
  }
  const reg = normalizeVehicleRegistration(registration_number);
  if (!reg) {
    return res.status(400).json({
      error: "Invalid vehicle number. Use CAPS without hyphen, e.g. KA01MM1234",
    });
  }
  const dup = await queryOne("SELECT id FROM vehicles WHERE registration_number = ?", [reg]);
  if (dup) return res.status(409).json({ error: "This vehicle number is already registered" });

  let smIds = [];
  if (site_manager_id != null && site_manager_id !== "") smIds = [Number(site_manager_id)];
  else if (Array.isArray(site_manager_ids)) smIds = site_manager_ids.map(Number).filter(Boolean);

  const smErr = await assertSmBelongsToClient(smIds, cid);
  if (smErr) return res.status(smErr.status).json({ error: smErr.error });

  const f = pickVehicleFields(req.body || {});
  const typeRes = await resolveVehicleType(req.body || {}, {});
  if (typeRes.error) return res.status(typeRes.status).json({ error: typeRes.error });
  const client = await queryOne("SELECT * FROM clients WHERE id = ?", [cid]);
  if (!client) return res.status(404).json({ error: "Site / client not found" });
  const slaErr = assertVehicleSla(client, f);
  if (slaErr) return res.status(slaErr.status).json({ error: slaErr.error });
  const serialRes = await allocateVehicleSerial(cid);
  if (serialRes.error) return res.status(serialRes.status).json({ error: serialRes.error });
  const result = await execute(
    `INSERT INTO vehicles (
      client_id, registration_number, vehicle_serial, ${VEHICLE_INSERT_COLS},
      is_active, approval_status, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'approved', ?)`,
    [cid, reg, serialRes.serial, ...vehicleFieldValues(f, typeRes), f.is_active, f.notes]
  );
  const vid = result.insertId;
  for (const smid of smIds) {
    await execute("INSERT IGNORE INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)", [vid, smid]);
  }
  res.status(201).json(await queryOne(`${VEHICLE_ADMIN_ROW} WHERE v.id = ?`, [vid]));
});

admin.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await queryOne("SELECT * FROM vehicles WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const body = req.body || {};
  let client_id = existing.client_id;
  let registration_number = existing.registration_number;

  if (body.client_id !== undefined && body.client_id !== null && body.client_id !== "") {
    client_id = Number(body.client_id);
  }
  if (body.registration_number !== undefined && body.registration_number !== null && String(body.registration_number).trim() !== "") {
    const reg = normalizeVehicleRegistration(body.registration_number);
    if (!reg) return res.status(400).json({ error: "Invalid vehicle number" });
    registration_number = reg;
  }

  const dup = await queryOne(
    "SELECT id FROM vehicles WHERE registration_number = ? AND id <> ?",
    [registration_number, id]
  );
  if (dup) return res.status(409).json({ error: "This vehicle number is already registered" });

  const f = pickVehicleFields(body, existing);
  const typeRes = await resolveVehicleType(body, existing);
  if (typeRes.error) return res.status(typeRes.status).json({ error: typeRes.error });
  const client = await queryOne("SELECT * FROM clients WHERE id = ?", [client_id]);
  if (!client) return res.status(404).json({ error: "Site / client not found" });
  const slaErr = assertVehicleSla(client, f);
  if (slaErr) return res.status(slaErr.status).json({ error: slaErr.error });
  await execute(
    `UPDATE vehicles SET client_id=?, registration_number=?,
      owner_name=?, owner_phone=?, ownership=?, make_model=?, vehicle_type_id=?, fuel_type=?,
      seating_capacity=?, registration_date=?, manufacture_year=?, attach_date=?, sub_vendor=?,
      engine_number=?, chassis_number=?, ac_type=?,
      gps_installed=?, gps_imei=?, gps_vendor=?,
      insurance_expiry=?, fitness_expiry=?, puc_expiry=?, tax_expiry=?, permit_expiry=?,
      form_42_47_expiry=?, form_49_expiry=?, is_active=?, notes=? WHERE id=?`,
    [client_id, registration_number, ...vehicleFieldValues(f, typeRes), f.is_active, f.notes, id]
  );

  const assignSm =
    Object.prototype.hasOwnProperty.call(body, "site_manager_id") || Array.isArray(body.site_manager_ids);

  if (assignSm) {
    if (existing.approval_status !== "approved") {
      return res.status(400).json({ error: "Assign site manager only after the vehicle is approved" });
    }
    await execute("DELETE FROM vehicle_site_managers WHERE vehicle_id = ?", [id]);
    let smIds = [];
    if (body.site_manager_id != null && body.site_manager_id !== "") smIds = [Number(body.site_manager_id)];
    else if (Array.isArray(body.site_manager_ids)) smIds = body.site_manager_ids.map(Number).filter(Boolean);
    const smErr = await assertSmBelongsToClient(smIds, client_id);
    if (smErr) return res.status(smErr.status).json({ error: smErr.error });
    for (const smid of smIds) {
      await execute("INSERT INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)", [id, smid]);
    }
  }

  res.json(await queryOne(`${VEHICLE_ADMIN_ROW} WHERE v.id = ?`, [id]));
});

admin.post("/:id/approve", async (req, res) => {
  const id = req.params.id;
  const existing = await queryOne("SELECT * FROM vehicles WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!["pending_review", "rejected"].includes(existing.approval_status)) {
    return res.status(400).json({ error: "Vehicle is not awaiting approval" });
  }
  await execute(
    `UPDATE vehicles SET approval_status='approved', reviewed_by_user_id=?, reviewed_at=NOW(),
      rejection_note=NULL, is_active=1 WHERE id=?`,
    [req.user.id, id]
  );
  if (existing.submitted_by_site_manager_id) {
    await execute("INSERT IGNORE INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)", [
      id,
      existing.submitted_by_site_manager_id,
    ]);
  }
  await execute(
    `UPDATE vehicle_documents SET status='approved', reviewed_by_user_id=?, reviewed_at=NOW()
     WHERE vehicle_id=? AND status='pending'`,
    [req.user.id, id]
  );
  res.json(await queryOne(`${VEHICLE_ADMIN_ROW} WHERE v.id = ?`, [id]));
});

admin.post("/:id/reject", async (req, res) => {
  const note = String(req.body?.rejection_note || req.body?.note || "").trim();
  if (!note) return res.status(400).json({ error: "rejection_note required" });
  const existing = await queryOne("SELECT * FROM vehicles WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.approval_status !== "pending_review") {
    return res.status(400).json({ error: "Only pending_review vehicles can be rejected" });
  }
  await execute(
    `UPDATE vehicles SET approval_status='rejected', reviewed_by_user_id=?, reviewed_at=NOW(),
      rejection_note=? WHERE id=?`,
    [req.user.id, note, req.params.id]
  );
  res.json(await queryOne(`${VEHICLE_ADMIN_ROW} WHERE v.id = ?`, [req.params.id]));
});

admin.post("/documents/:docId/approve", async (req, res) => {
  const doc = await queryOne("SELECT * FROM vehicle_documents WHERE id = ?", [req.params.docId]);
  if (!doc) return res.status(404).json({ error: "Not found" });
  await execute(
    `UPDATE vehicle_documents SET status='approved', rejection_note=NULL,
      reviewed_by_user_id=?, reviewed_at=NOW() WHERE id=?`,
    [req.user.id, doc.id]
  );
  res.json(await queryOne("SELECT * FROM vehicle_documents WHERE id = ?", [doc.id]));
});

admin.post("/documents/:docId/reject", async (req, res) => {
  const note = String(req.body?.rejection_note || req.body?.note || "").trim();
  if (!note) return res.status(400).json({ error: "rejection_note required" });
  const doc = await queryOne("SELECT * FROM vehicle_documents WHERE id = ?", [req.params.docId]);
  if (!doc) return res.status(404).json({ error: "Not found" });
  await execute(
    `UPDATE vehicle_documents SET status='rejected', rejection_note=?,
      reviewed_by_user_id=?, reviewed_at=NOW() WHERE id=?`,
    [note, req.user.id, doc.id]
  );
  res.json(await queryOne("SELECT * FROM vehicle_documents WHERE id = ?", [doc.id]));
});

admin.delete("/:id", async (req, res) => {
  await execute("DELETE FROM vehicles WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

const sm = Router();
sm.use(requireAuth, requireSiteManager);

sm.get("/mine", async (req, res) => {
  const smRow = await queryOne("SELECT id, client_id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const forWork = String(req.query.for_work || "") === "1";
  if (forWork) {
    return res.json(
      await query(
        `SELECT v.*, c.name AS client_name, ${SLA_SELECT}
         FROM vehicles v
         JOIN vehicle_site_managers vsm ON vsm.vehicle_id = v.id
         JOIN clients c ON c.id = v.client_id
         WHERE vsm.site_manager_id = ? AND v.approval_status = 'approved' AND v.is_active = 1
         ORDER BY v.registration_number`,
        [smRow.id]
      )
    );
  }
  res.json(
    await query(
      `SELECT v.*, c.name AS client_name, ${SLA_SELECT},
         (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id) AS doc_count
       FROM vehicles v
       JOIN clients c ON c.id = v.client_id
       WHERE v.submitted_by_site_manager_id = ?
          OR v.id IN (SELECT vehicle_id FROM vehicle_site_managers WHERE site_manager_id = ?)
       ORDER BY v.id DESC`,
      [smRow.id, smRow.id]
    )
  );
});

sm.get("/doc-types", (_req, res) => res.json(VEHICLE_DOC_TYPES));

sm.post("/", async (req, res) => {
  const smRow = await queryOne("SELECT id, client_id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const { registration_number } = req.body || {};
  if (!registration_number || String(registration_number).trim() === "") {
    return res.status(400).json({ error: "Vehicle registration is required" });
  }
  const reg = normalizeVehicleRegistration(registration_number);
  if (!reg) return res.status(400).json({ error: "Invalid vehicle number. Use CAPS without hyphen, e.g. KA01MM1234" });
  const dup = await queryOne("SELECT id FROM vehicles WHERE registration_number = ?", [reg]);
  if (dup) return res.status(409).json({ error: "This vehicle number is already registered" });

  const f = pickVehicleFields(req.body || {});
  const typeRes = await resolveVehicleType(req.body || {}, {});
  if (typeRes.error) return res.status(typeRes.status).json({ error: typeRes.error });
  const client = await queryOne("SELECT * FROM clients WHERE id = ?", [smRow.client_id]);
  const slaErr = assertVehicleSla(client, f);
  if (slaErr) return res.status(slaErr.status).json({ error: slaErr.error });
  const serialRes = await allocateVehicleSerial(smRow.client_id);
  if (serialRes.error) return res.status(serialRes.status).json({ error: serialRes.error });
  const result = await execute(
    `INSERT INTO vehicles (
      client_id, registration_number, vehicle_serial, ${VEHICLE_INSERT_COLS},
      is_active, approval_status, submitted_by_site_manager_id, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'draft',?,?)`,
    [smRow.client_id, reg, serialRes.serial, ...vehicleFieldValues(f, typeRes), smRow.id, f.notes]
  );
  res.status(201).json(
    await queryOne(
      `SELECT v.*, c.name AS client_name FROM vehicles v JOIN clients c ON c.id = v.client_id WHERE v.id = ?`,
      [result.insertId]
    )
  );
});

sm.patch("/:id", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await smCanAccessVehicle(smRow.id, req.params.id);
  if (access.error) return res.status(access.status).json({ error: access.error });
  const existing = access.vehicle;
  if (!["draft", "rejected"].includes(existing.approval_status)) {
    return res.status(400).json({ error: "Only draft or rejected vehicles can be edited by site manager" });
  }
  if (Number(existing.submitted_by_site_manager_id) !== Number(smRow.id)) {
    return res.status(403).json({ error: "You can only edit vehicles you submitted" });
  }

  const body = req.body || {};
  let registration_number = existing.registration_number;
  if (body.registration_number != null && String(body.registration_number).trim() !== "") {
    const reg = normalizeVehicleRegistration(body.registration_number);
    if (!reg) return res.status(400).json({ error: "Invalid vehicle number" });
    registration_number = reg;
  }
  const dup = await queryOne(
    "SELECT id FROM vehicles WHERE registration_number = ? AND id <> ?",
    [registration_number, existing.id]
  );
  if (dup) return res.status(409).json({ error: "This vehicle number is already registered" });

  const f = pickVehicleFields(body, existing);
  const typeRes = await resolveVehicleType(body, existing);
  if (typeRes.error) return res.status(typeRes.status).json({ error: typeRes.error });
  const client = await queryOne("SELECT * FROM clients WHERE id = ?", [existing.client_id]);
  const slaErr = assertVehicleSla(client, f);
  if (slaErr) return res.status(slaErr.status).json({ error: slaErr.error });
  await execute(
    `UPDATE vehicles SET registration_number=?,
      owner_name=?, owner_phone=?, ownership=?, make_model=?, vehicle_type_id=?, fuel_type=?,
      seating_capacity=?, registration_date=?, manufacture_year=?, attach_date=?, sub_vendor=?,
      engine_number=?, chassis_number=?, ac_type=?,
      gps_installed=?, gps_imei=?, gps_vendor=?,
      insurance_expiry=?, fitness_expiry=?, puc_expiry=?, tax_expiry=?, permit_expiry=?,
      form_42_47_expiry=?, form_49_expiry=?, notes=?,
      approval_status='draft', rejection_note=NULL WHERE id=?`,
    [registration_number, ...vehicleFieldValues(f, typeRes), f.notes, existing.id]
  );
  res.json(
    await queryOne(
      `SELECT v.*, c.name AS client_name FROM vehicles v JOIN clients c ON c.id = v.client_id WHERE v.id = ?`,
      [existing.id]
    )
  );
});

sm.get("/:id/documents", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await smCanAccessVehicle(smRow.id, req.params.id);
  if (access.error) return res.status(access.status).json({ error: access.error });
  res.json(await listDocs(req.params.id));
});

sm.post("/:id/documents", uploadDoc.single("file"), async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await smCanAccessVehicle(smRow.id, req.params.id);
  if (access.error) return res.status(access.status).json({ error: access.error });
  const existing = access.vehicle;
  if (!["draft", "rejected", "pending_review"].includes(existing.approval_status)) {
    return res.status(400).json({ error: "Cannot upload documents for an approved vehicle here" });
  }
  if (Number(existing.submitted_by_site_manager_id) !== Number(smRow.id)) {
    return res.status(403).json({ error: "You can only upload docs for vehicles you submitted" });
  }
  if (!req.file) return res.status(400).json({ error: "file required" });
  const docType = String(req.body?.doc_type || "").toUpperCase();
  if (!isValidDocType(docType)) {
    return res.status(400).json({ error: `doc_type must be one of: ${VEHICLE_DOC_TYPES.join(", ")}` });
  }
  const expiry = req.body?.expiry_date ? String(req.body.expiry_date) : null;
  const filePath = `/uploads/vehicles/${req.file.filename}`;

  // Replace previous uploads of the same type so each section has one current file
  const oldDocs = await query(
    "SELECT id, file_path FROM vehicle_documents WHERE vehicle_id = ? AND doc_type = ?",
    [existing.id, docType]
  );
  for (const od of oldDocs) {
    await execute("DELETE FROM vehicle_documents WHERE id = ?", [od.id]);
    if (od.file_path) {
      const abs = path.join(uploadRoot, String(od.file_path).replace(/^\/uploads\/?/, ""));
      fs.unlink(abs, () => {});
    }
  }

  const result = await execute(
    `INSERT INTO vehicle_documents
      (vehicle_id, doc_type, file_path, original_filename, expiry_date, status, uploaded_by_user_id)
     VALUES (?,?,?,?,?,'pending',?)`,
    [existing.id, docType, filePath, req.file.originalname || req.file.filename, expiry, req.user.id]
  );

  const vehicleDateCol = DOC_TYPE_VEHICLE_DATE[docType];
  if (vehicleDateCol && expiry) {
    await execute(`UPDATE vehicles SET ${vehicleDateCol} = ? WHERE id = ?`, [expiry, existing.id]);
    // Permit upload also fills Fleetbook 42/47 expiry when present
    if (docType === "PERMIT") {
      await execute(`UPDATE vehicles SET form_42_47_expiry = ? WHERE id = ?`, [expiry, existing.id]);
    }
  }

  if (existing.approval_status === "rejected") {
    await execute("UPDATE vehicles SET approval_status='draft', rejection_note=NULL WHERE id=?", [existing.id]);
  }
  res.status(201).json(await queryOne("SELECT * FROM vehicle_documents WHERE id = ?", [result.insertId]));
});

/** Remove a document from a draft/rejected/pending vehicle (site manager who submitted it). */
sm.delete("/:id/documents/:docId", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await smCanAccessVehicle(smRow.id, req.params.id);
  if (access.error) return res.status(access.status).json({ error: access.error });
  const existing = access.vehicle;
  if (!["draft", "rejected", "pending_review"].includes(existing.approval_status)) {
    return res.status(400).json({ error: "Cannot remove documents for an approved vehicle here" });
  }
  if (Number(existing.submitted_by_site_manager_id) !== Number(smRow.id)) {
    return res.status(403).json({ error: "You can only manage docs for vehicles you submitted" });
  }
  const doc = await queryOne("SELECT * FROM vehicle_documents WHERE id = ? AND vehicle_id = ?", [
    req.params.docId,
    existing.id,
  ]);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  await execute("DELETE FROM vehicle_documents WHERE id = ?", [doc.id]);
  if (doc.file_path) {
    const abs = path.join(uploadRoot, String(doc.file_path).replace(/^\/uploads\/?/, ""));
    fs.unlink(abs, () => {});
  }
  res.status(204).end();
});

sm.post("/:id/submit", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await smCanAccessVehicle(smRow.id, req.params.id);
  if (access.error) return res.status(access.status).json({ error: access.error });
  const existing = access.vehicle;
  if (Number(existing.submitted_by_site_manager_id) !== Number(smRow.id)) {
    return res.status(403).json({ error: "You can only submit vehicles you created" });
  }
  if (!["draft", "rejected"].includes(existing.approval_status)) {
    return res.status(400).json({ error: "Vehicle is already submitted or approved" });
  }
  const docs = await queryOne("SELECT COUNT(*) AS c FROM vehicle_documents WHERE vehicle_id = ?", [existing.id]);
  if (!Number(docs?.c || 0)) {
    return res.status(400).json({ error: "Upload at least one supporting document before submit" });
  }

  await execute(
    `UPDATE vehicles SET approval_status='pending_review', submitted_at=NOW(),
      submitted_by_site_manager_id=?, rejection_note=NULL WHERE id=?`,
    [smRow.id, existing.id]
  );

  const smUser = await queryOne("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
  await notifyAdmin({
    type: "vehicle_submitted",
    title: `Vehicle pending approval: ${existing.registration_number}`,
    body: `${smUser?.full_name || "Site manager"} submitted vehicle ${existing.registration_number} with documents for review.`,
    entityType: "vehicle",
    entityId: existing.id,
  });

  res.json(
    await queryOne(
      `SELECT v.*, c.name AS client_name FROM vehicles v JOIN clients c ON c.id = v.client_id WHERE v.id = ?`,
      [existing.id]
    )
  );
});

sm.get("/:vehicleId/indent-history", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await queryOne(
    "SELECT 1 FROM vehicle_site_managers WHERE vehicle_id = ? AND site_manager_id = ?",
    [req.params.vehicleId, smRow.id]
  );
  if (!access) return res.status(403).json({ error: "Vehicle not assigned to you" });
  const veh = await queryOne("SELECT approval_status FROM vehicles WHERE id = ?", [req.params.vehicleId]);
  if (!veh || veh.approval_status !== "approved") {
    return res.status(403).json({ error: "Vehicle is not approved for work yet" });
  }
  const rows = await query(
    `SELECT i.id, i.serial_number, i.amount_rs, i.status, i.created_at,
            u.full_name AS issued_by_name
     FROM indents i
     JOIN site_managers sm ON sm.id = i.site_manager_id
     JOIN users u ON u.id = sm.user_id
     WHERE i.vehicle_id = ? AND i.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     ORDER BY i.created_at DESC`,
    [req.params.vehicleId]
  );
  const sumRow = await queryOne(
    `SELECT COALESCE(SUM(amount_rs),0) AS total_rs, COUNT(*) AS cnt FROM indents
     WHERE vehicle_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status != 'cancelled'`,
    [req.params.vehicleId]
  );
  res.json({ indents: rows, summary: sumRow });
});

export { admin as vehiclesAdmin, sm as vehiclesSm };
