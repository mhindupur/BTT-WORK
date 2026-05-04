import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/", async (_req, res) => {
  const rows = await query(
    `SELECT sm.id, sm.client_id, sm.location_label, sm.user_id,
            u.email, u.full_name, u.phone, c.name AS client_name
     FROM site_managers sm
     JOIN users u ON u.id = sm.user_id
     JOIN clients c ON c.id = sm.client_id
     ORDER BY sm.id DESC`
  );
  res.json(rows);
});

/** Create site manager: optional password; if omitted, auto-generate and return once */
r.post("/", async (req, res) => {
  const { email, full_name, phone, client_id, location_label, password } = req.body || {};
  if (!email || !full_name || !client_id) {
    return res.status(400).json({ error: "email, full_name, client_id required" });
  }
  const exists = await queryOne("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (exists) return res.status(409).json({ error: "Email already in use" });
  const plain = password || crypto.randomBytes(6).toString("base64url");
  const hash = await bcrypt.hash(plain, 10);
  const ures = await execute(
    "INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?,?,?,?,?)",
    [email.trim().toLowerCase(), hash, "site_manager", full_name, phone || null]
  );
  await execute(
    "INSERT INTO site_managers (user_id, client_id, location_label) VALUES (?,?,?)",
    [ures.insertId, client_id, location_label || null]
  );
  const row = await queryOne(
    `SELECT sm.id, sm.user_id, sm.client_id, sm.location_label, u.email, u.full_name
     FROM site_managers sm JOIN users u ON u.id = sm.user_id WHERE sm.user_id = ?`,
    [ures.insertId]
  );
  res.status(201).json({ ...row, temporary_password: password ? undefined : plain });
});

r.patch("/:id", async (req, res) => {
  const sm = await queryOne("SELECT user_id FROM site_managers WHERE id = ?", [req.params.id]);
  if (!sm) return res.status(404).json({ error: "Not found" });
  const { full_name, phone, location_label, client_id } = req.body || {};
  if (full_name != null || phone != null) {
    await execute(
      "UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?",
      [full_name ?? null, phone ?? null, sm.user_id]
    );
  }
  if (location_label != null || client_id != null) {
    await execute(
      "UPDATE site_managers SET location_label = COALESCE(?, location_label), client_id = COALESCE(?, client_id) WHERE id = ?",
      [location_label ?? null, client_id ?? null, req.params.id]
    );
  }
  const row = await queryOne(
    `SELECT sm.*, u.email, u.full_name, u.phone FROM site_managers sm JOIN users u ON u.id = sm.user_id WHERE sm.id = ?`,
    [req.params.id]
  );
  res.json(row);
});

r.post("/:id/reset-password", async (req, res) => {
  const sm = await queryOne("SELECT user_id FROM site_managers WHERE id = ?", [req.params.id]);
  if (!sm) return res.status(404).json({ error: "Not found" });
  const plain = crypto.randomBytes(8).toString("base64url");
  const hash = await bcrypt.hash(plain, 10);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, sm.user_id]);
  res.json({ temporary_password: plain });
});

export default r;
