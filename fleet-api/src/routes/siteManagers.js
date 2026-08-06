import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, queryOne, execute, pool } from "../db.js";
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

/**
 * Create site manager with an admin-set password (no OTP).
 * WhatsApp OTP onboarding can be re-enabled for production later.
 */
r.post("/", async (req, res) => {
  const { email, full_name, phone, client_id, location_label, password } = req.body || {};
  if (!email || !full_name || !client_id) {
    return res.status(400).json({ error: "email, full_name, client_id required" });
  }
  const plain = String(password || "").trim();
  if (plain.length < 6) {
    return res.status(400).json({ error: "password required (min 6 characters)" });
  }
  const exists = await queryOne("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (exists) return res.status(409).json({ error: "Email already in use" });
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
  res.status(201).json({ ...row, password_set: true });
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

/**
 * Admin sets site manager password directly (temporary until OTP/WhatsApp is production-ready).
 * Body: { new_password: string }
 */
r.post("/:id/reset-password", async (req, res) => {
  const sm = await queryOne("SELECT user_id FROM site_managers WHERE id = ?", [req.params.id]);
  if (!sm) return res.status(404).json({ error: "Not found" });
  const newPassword = String(req.body?.new_password || "").trim();
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "new_password required (min 6 characters)" });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, sm.user_id]);
  // Invalidate any pending OTPs so old codes cannot be used
  await execute("UPDATE password_reset_otps SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL", [
    sm.user_id,
  ]);
  res.json({ ok: true, password_set: true });
});

/** Handover site manager responsibilities to another SM of the same client */
r.post("/:id/handover", async (req, res) => {
  const fromId = Number(req.params.id);
  const toId = Number(req.body?.to_site_manager_id);
  if (!fromId || !toId || fromId === toId) {
    return res.status(400).json({ error: "to_site_manager_id required and must differ" });
  }

  const from = await queryOne("SELECT id, client_id FROM site_managers WHERE id = ?", [fromId]);
  const to = await queryOne("SELECT id, client_id FROM site_managers WHERE id = ?", [toId]);
  if (!from || !to) return res.status(404).json({ error: "Site manager not found" });
  if (Number(from.client_id) !== Number(to.client_id)) {
    return res.status(400).json({ error: "Both site managers must belong to the same client" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Transfer vehicle allocations
    await conn.execute(
      `INSERT IGNORE INTO vehicle_site_managers (vehicle_id, site_manager_id)
       SELECT vehicle_id, ? FROM vehicle_site_managers WHERE site_manager_id = ?`,
      [toId, fromId]
    );
    await conn.execute("DELETE FROM vehicle_site_managers WHERE site_manager_id = ?", [fromId]);

    // Transfer indents (preserve history under new SM)
    await conn.execute("UPDATE indents SET site_manager_id = ? WHERE site_manager_id = ?", [toId, fromId]);

    // Transfer admin-issued serial ranges/pools
    await conn.execute("UPDATE indent_serial_batches SET site_manager_id = ? WHERE site_manager_id = ?", [
      toId,
      fromId,
    ]);
    await conn.execute("UPDATE indent_serial_pool SET site_manager_id = ? WHERE site_manager_id = ?", [toId, fromId]);

    await conn.commit();
    res.json({ ok: true, from_site_manager_id: fromId, to_site_manager_id: toId });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

/** Delete site manager only if nothing is assigned (or after handover). */
r.delete("/:id", async (req, res) => {
  const sm = await queryOne("SELECT id, user_id FROM site_managers WHERE id = ?", [req.params.id]);
  if (!sm) return res.status(404).json({ error: "Not found" });

  const c1 = await queryOne("SELECT COUNT(*) AS c FROM indents WHERE site_manager_id = ?", [sm.id]);
  const c2 = await queryOne("SELECT COUNT(*) AS c FROM vehicle_site_managers WHERE site_manager_id = ?", [sm.id]);
  const c3 = await queryOne("SELECT COUNT(*) AS c FROM indent_serial_pool WHERE site_manager_id = ?", [sm.id]);

  const counts = {
    indents: Number(c1?.c || 0),
    vehicles: Number(c2?.c || 0),
    serial_pool: Number(c3?.c || 0),
  };
  if (counts.indents || counts.vehicles || counts.serial_pool) {
    return res.status(409).json({
      error: "Site manager has assigned indents/vehicles/serials. Handover before delete.",
      counts,
    });
  }

  // Delete user → cascades site_managers row (fk_sm_user ON DELETE CASCADE)
  await execute("DELETE FROM users WHERE id = ?", [sm.user_id]);
  res.status(204).end();
});

export default r;
