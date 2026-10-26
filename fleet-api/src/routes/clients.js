import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { normalizeSiteCode } from "../utils/vehicleReg.js";

const r = Router();
r.use(requireAuth, requireAdmin);

const CLIENT_COLS = `c.id, c.name, c.site_code, c.email, c.phone, c.address, c.latitude, c.longitude,
  c.start_date, c.vendor_type, c.sla_max_age_years, c.created_at,
  TIMESTAMPDIFF(YEAR, c.start_date, CURDATE()) AS site_age_years,
  (SELECT GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR ', ')
     FROM client_account_managers cam
     JOIN users u ON u.id = cam.user_id
    WHERE cam.client_id = c.id) AS account_manager_names,
  (SELECT GROUP_CONCAT(cam.user_id ORDER BY cam.user_id)
     FROM client_account_managers cam
    WHERE cam.client_id = c.id) AS account_manager_user_ids`;

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

function parseAmUserIds(body) {
  if (Array.isArray(body.account_manager_user_ids)) {
    return body.account_manager_user_ids.map(Number).filter(Boolean);
  }
  if (Object.prototype.hasOwnProperty.call(body, "account_manager_user_id")) {
    const v = body.account_manager_user_id;
    if (v === "" || v == null) return [];
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? [n] : [];
  }
  return null; // not provided
}

async function assertAccountManagers(ids) {
  for (const uid of ids) {
    const u = await queryOne(
      "SELECT id FROM users WHERE id = ? AND role = 'account_manager' AND is_active = 1",
      [uid]
    );
    if (!u) return { error: `Invalid account manager user_id ${uid}`, status: 400 };
  }
  return null;
}

async function syncAccountManagers(clientId, userIds) {
  await execute("DELETE FROM client_account_managers WHERE client_id = ?", [clientId]);
  for (const uid of userIds) {
    await execute("INSERT INTO client_account_managers (client_id, user_id) VALUES (?,?)", [
      clientId,
      uid,
    ]);
  }
}

function enrichClientRow(row) {
  if (!row) return row;
  const ids = String(row.account_manager_user_ids || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean);
  return { ...row, account_manager_user_ids: ids };
}

r.get("/", async (_req, res) => {
  const rows = await query(`SELECT ${CLIENT_COLS} FROM clients c ORDER BY c.id DESC`);
  res.json(rows.map(enrichClientRow));
});

r.post("/", async (req, res) => {
  const body = req.body || {};
  const f = pickClientFields(body);
  if (!f.name) return res.status(400).json({ error: "name required" });
  if (!f.site_code) {
    return res.status(400).json({ error: "site_code required — exactly 5 letters/digits, e.g. INFNG" });
  }
  const clash = await queryOne("SELECT id FROM clients WHERE site_code = ?", [f.site_code]);
  if (clash) return res.status(409).json({ error: "Site code already in use" });

  const amIds = parseAmUserIds(body) || [];
  const amErr = await assertAccountManagers(amIds);
  if (amErr) return res.status(amErr.status).json({ error: amErr.error });

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
  if (amIds.length) await syncAccountManagers(result.insertId, amIds);
  res.status(201).json(
    enrichClientRow(await queryOne(`SELECT ${CLIENT_COLS} FROM clients c WHERE c.id = ?`, [result.insertId]))
  );
});

r.patch("/:id", async (req, res) => {
  const existing = await queryOne("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const body = req.body || {};
  const f = pickClientFields(body, existing);
  if (!f.name) return res.status(400).json({ error: "name required" });
  if (!f.site_code) {
    return res.status(400).json({ error: "site_code required — exactly 5 letters/digits, e.g. INFNG" });
  }
  const clash = await queryOne("SELECT id FROM clients WHERE site_code = ? AND id <> ?", [
    f.site_code,
    existing.id,
  ]);
  if (clash) return res.status(409).json({ error: "Site code already in use" });

  const amIds = parseAmUserIds(body);
  if (amIds) {
    const amErr = await assertAccountManagers(amIds);
    if (amErr) return res.status(amErr.status).json({ error: amErr.error });
  }

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
  if (amIds) await syncAccountManagers(existing.id, amIds);
  res.json(
    enrichClientRow(await queryOne(`SELECT ${CLIENT_COLS} FROM clients c WHERE c.id = ?`, [existing.id]))
  );
});

r.delete("/:id", async (req, res) => {
  await execute("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

export default r;
