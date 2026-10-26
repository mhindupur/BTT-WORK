import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

async function loadAccountManager(userId) {
  const u = await queryOne(
    `SELECT id, email, full_name, phone, is_active, created_at
     FROM users WHERE id = ? AND role = 'account_manager'`,
    [userId]
  );
  if (!u) return null;
  const sites = await query(
    `SELECT c.id, c.name, c.site_code
     FROM client_account_managers cam
     JOIN clients c ON c.id = cam.client_id
     WHERE cam.user_id = ?
     ORDER BY c.name`,
    [userId]
  );
  return {
    ...u,
    client_ids: sites.map((s) => Number(s.id)),
    sites,
  };
}

r.get("/", async (_req, res) => {
  const users = await query(
    `SELECT id, email, full_name, phone, is_active, created_at
     FROM users WHERE role = 'account_manager' ORDER BY id DESC`
  );
  const out = [];
  for (const u of users) {
    out.push(await loadAccountManager(u.id));
  }
  res.json(out);
});

r.post("/", async (req, res) => {
  const { email, full_name, phone, password, client_ids } = req.body || {};
  if (!email || !full_name) {
    return res.status(400).json({ error: "email, full_name required" });
  }
  const plain = String(password || "").trim();
  if (plain.length < 6) {
    return res.status(400).json({ error: "password required (min 6 characters)" });
  }
  const exists = await queryOne("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const ids = Array.isArray(client_ids)
    ? client_ids.map(Number).filter(Boolean)
    : req.body?.client_id
      ? [Number(req.body.client_id)]
      : [];

  for (const cid of ids) {
    const c = await queryOne("SELECT id FROM clients WHERE id = ?", [cid]);
    if (!c) return res.status(400).json({ error: `Invalid client_id ${cid}` });
  }

  const hash = await bcrypt.hash(plain, 10);
  const ures = await execute(
    "INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?,?,?,?,?)",
    [email.trim().toLowerCase(), hash, "account_manager", full_name, phone || null]
  );
  for (const cid of ids) {
    await execute(
      "INSERT IGNORE INTO client_account_managers (client_id, user_id) VALUES (?,?)",
      [cid, ures.insertId]
    );
  }
  res.status(201).json({ ...(await loadAccountManager(ures.insertId)), password_set: true });
});

r.patch("/:id", async (req, res) => {
  const existing = await queryOne(
    "SELECT id FROM users WHERE id = ? AND role = 'account_manager'",
    [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { full_name, phone, is_active, client_ids } = req.body || {};
  if (full_name != null || phone != null || is_active != null) {
    await execute(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        full_name ?? null,
        phone ?? null,
        is_active == null ? null : is_active ? 1 : 0,
        existing.id,
      ]
    );
  }

  if (Array.isArray(client_ids)) {
    const ids = client_ids.map(Number).filter(Boolean);
    for (const cid of ids) {
      const c = await queryOne("SELECT id FROM clients WHERE id = ?", [cid]);
      if (!c) return res.status(400).json({ error: `Invalid client_id ${cid}` });
    }
    await execute("DELETE FROM client_account_managers WHERE user_id = ?", [existing.id]);
    for (const cid of ids) {
      await execute("INSERT INTO client_account_managers (client_id, user_id) VALUES (?,?)", [
        cid,
        existing.id,
      ]);
    }
  }

  res.json(await loadAccountManager(existing.id));
});

r.post("/:id/reset-password", async (req, res) => {
  const existing = await queryOne(
    "SELECT id FROM users WHERE id = ? AND role = 'account_manager'",
    [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Not found" });
  const newPassword = String(req.body?.new_password || "").trim();
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "new_password required (min 6 characters)" });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, existing.id]);
  res.json({ ok: true, password_set: true });
});

r.delete("/:id", async (req, res) => {
  const existing = await queryOne(
    "SELECT id FROM users WHERE id = ? AND role = 'account_manager'",
    [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Not found" });
  await execute("DELETE FROM users WHERE id = ?", [existing.id]);
  res.status(204).end();
});

export default r;
