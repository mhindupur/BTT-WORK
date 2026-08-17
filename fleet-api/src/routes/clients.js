import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { normalizeSiteCode } from "../utils/vehicleReg.js";

const r = Router();
r.use(requireAuth, requireAdmin);

const CLIENT_COLS = `id, name, site_code, email, phone, address, latitude, longitude,
  start_date, vendor_type, sla_max_age_years, created_at,
  TIMESTAMPDIFF(YEAR, start_date, CURDATE()) AS site_age_years`;

function pickClientFields(body, existing = {}) {
  const out = {
    name: existing.name ?? null,
    site_code: existing.site_code ?? null,
    email: existing.email ?? null,
    phone: existing.phone ?? null,
    address: existing.address ?? null,
    latitude: existing.latitude ?? null,
    longitude: existing.longitude ?? null,
    start_date: existing.start_date ?? null,
    vendor_type: existing.vendor_type ?? null,
    sla_max_age_years: existing.sla_max_age_years ?? null,
  };
  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    out.name = body.name ? String(body.name).trim() : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "site_code") || (!existing.id && body.site_code != null)) {
    const code = normalizeSiteCode(body.site_code);
    out.site_code = code;
  }
  for (const k of ["email", "phone", "address", "start_date"]) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      out[k] = v === "" || v == null ? null : String(v);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "vendor_type")) {
    const v = String(body.vendor_type || "").toUpperCase();
    out.vendor_type = v === "SINGLE" || v === "MULTIPLE" ? v : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "latitude")) {
    const n = body.latitude === "" || body.latitude == null ? null : Number(body.latitude);
    out.latitude = Number.isFinite(n) ? n : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "longitude")) {
    const n = body.longitude === "" || body.longitude == null ? null : Number(body.longitude);
    out.longitude = Number.isFinite(n) ? n : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "sla_max_age_years")) {
    if (body.sla_max_age_years === "" || body.sla_max_age_years == null) out.sla_max_age_years = null;
    else {
      const n = Number(body.sla_max_age_years);
      out.sla_max_age_years = Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return out;
}

r.get("/", async (_req, res) => {
  res.json(await query(`SELECT ${CLIENT_COLS} FROM clients ORDER BY id DESC`));
});

r.post("/", async (req, res) => {
  const f = pickClientFields(req.body || {});
  if (!f.name) return res.status(400).json({ error: "name required" });
  if (!f.site_code) {
    return res.status(400).json({ error: "site_code required — exactly 5 letters/digits, e.g. INFNG" });
  }
  const clash = await queryOne("SELECT id FROM clients WHERE site_code = ?", [f.site_code]);
  if (clash) return res.status(409).json({ error: "Site code already in use" });
  const result = await execute(
    `INSERT INTO clients (name, site_code, email, phone, address, latitude, longitude, start_date, vendor_type, sla_max_age_years)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      f.name,
      f.site_code,
      f.email,
      f.phone,
      f.address,
      f.latitude,
      f.longitude,
      f.start_date,
      f.vendor_type,
      f.sla_max_age_years,
    ]
  );
  res.status(201).json(await queryOne(`SELECT ${CLIENT_COLS} FROM clients WHERE id = ?`, [result.insertId]));
});

r.patch("/:id", async (req, res) => {
  const existing = await queryOne("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const f = pickClientFields(req.body || {}, existing);
  if (!f.name) return res.status(400).json({ error: "name required" });
  if (!f.site_code) {
    return res.status(400).json({ error: "site_code required — exactly 5 letters/digits, e.g. INFNG" });
  }
  const clash = await queryOne("SELECT id FROM clients WHERE site_code = ? AND id <> ?", [
    f.site_code,
    existing.id,
  ]);
  if (clash) return res.status(409).json({ error: "Site code already in use" });
  await execute(
    `UPDATE clients SET name=?, site_code=?, email=?, phone=?, address=?, latitude=?, longitude=?,
      start_date=?, vendor_type=?, sla_max_age_years=? WHERE id=?`,
    [
      f.name,
      f.site_code,
      f.email,
      f.phone,
      f.address,
      f.latitude,
      f.longitude,
      f.start_date,
      f.vendor_type,
      f.sla_max_age_years,
      existing.id,
    ]
  );
  res.json(await queryOne(`SELECT ${CLIENT_COLS} FROM clients WHERE id = ?`, [existing.id]));
});

r.delete("/:id", async (req, res) => {
  await execute("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

export default r;
