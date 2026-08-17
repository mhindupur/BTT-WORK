import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeWhatsAppDigits, sendAuthOtpWhatsApp } from "../services/whatsapp.js";

const r = Router();

r.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const user = await queryOne(
    "SELECT id, email, password_hash, role, full_name, phone, is_active FROM users WHERE email = ?",
    [String(email).trim().toLowerCase()]
  );
  if (!user || !user.is_active) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
  let clientId = null;
  let siteManagerId = null;
  if (user.role === "site_manager") {
    const sm = await queryOne(
      "SELECT id, client_id FROM site_managers WHERE user_id = ?",
      [user.id]
    );
    if (sm) {
      siteManagerId = sm.id;
      clientId = sm.client_id;
    }
  }
  res.json({
    access_token: token,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      client_id: clientId,
      site_manager_id: siteManagerId,
    },
  });
});

r.get("/me", requireAuth, async (req, res) => {
  const user = await queryOne(
    "SELECT id, email, role, full_name, phone FROM users WHERE id = ?",
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: "Not found" });
  let clientId = null;
  let siteManagerId = null;
  if (user.role === "site_manager") {
    const sm = await queryOne("SELECT id, client_id FROM site_managers WHERE user_id = ?", [
      user.id,
    ]);
    if (sm) {
      siteManagerId = sm.id;
      clientId = sm.client_id;
    }
  }
  res.json({ ...user, client_id: clientId, site_manager_id: siteManagerId });
});

/**
 * Step 1: request OTP to WhatsApp (Authentication template).
 * Body: { phone: string }
 * Response: { ok: true } (does not leak user existence)
 */
r.post("/request-otp", async (req, res) => {
  const phoneRaw = String(req.body?.phone || "").trim();
  if (!phoneRaw) return res.status(400).json({ error: "phone required" });

  const e164 = normalizeWhatsAppDigits(phoneRaw);
  if (!e164) return res.status(400).json({ error: "invalid phone" });

  const u = await queryOne(
    "SELECT id, full_name, phone, role, is_active FROM users WHERE phone = ? AND role = 'site_manager'",
    [phoneRaw]
  );
  if (!u || !u.is_active) {
    // Avoid leaking user existence; behave as success.
    return res.json({ ok: true });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const ttlMin = Number(process.env.AUTH_OTP_TTL_MINUTES || 10);
  const exp = new Date(Date.now() + ttlMin * 60 * 1000);

  // Invalidate old OTPs for this user
  await execute("UPDATE password_reset_otps SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL", [
    u.id,
  ]);
  await execute(
    "INSERT INTO password_reset_otps (user_id, phone_e164, otp_hash, expires_at) VALUES (?,?,?,?)",
    [u.id, e164, otpHash, exp]
  );

  await sendAuthOtpWhatsApp(u.phone, otp, { callbackData: `auth_otp:${u.id}` });
  res.json({ ok: true });
});

/**
 * Step 2: verify OTP and set a new password.
 * Body: { phone, otp, new_password }
 */
r.post("/reset-password-with-otp", async (req, res) => {
  const phoneRaw = String(req.body?.phone || "").trim();
  const otp = String(req.body?.otp || "").trim();
  const newPassword = String(req.body?.new_password || "");
  if (!phoneRaw || !otp || !newPassword) {
    return res.status(400).json({ error: "phone, otp, new_password required" });
  }
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const e164 = normalizeWhatsAppDigits(phoneRaw);
  if (!e164) return res.status(400).json({ error: "invalid phone" });

  const u = await queryOne(
    "SELECT id, phone, role, is_active FROM users WHERE phone = ? AND role = 'site_manager'",
    [phoneRaw]
  );
  if (!u || !u.is_active) return res.status(400).json({ error: "Invalid phone or OTP" });

  const rec = await queryOne(
    `SELECT id, otp_hash, expires_at, attempts FROM password_reset_otps
     WHERE user_id = ? AND consumed_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [u.id]
  );
  if (!rec) return res.status(400).json({ error: "OTP expired. Request a new OTP." });

  const exp = new Date(rec.expires_at);
  if (Number.isNaN(exp.getTime()) || exp.getTime() < Date.now()) {
    await execute("UPDATE password_reset_otps SET consumed_at = NOW() WHERE id = ?", [rec.id]);
    return res.status(400).json({ error: "OTP expired. Request a new OTP." });
  }
  if (Number(rec.attempts || 0) >= 5) {
    await execute("UPDATE password_reset_otps SET consumed_at = NOW() WHERE id = ?", [rec.id]);
    return res.status(400).json({ error: "Too many attempts. Request a new OTP." });
  }

  const ok = await bcrypt.compare(otp, rec.otp_hash);
  await execute("UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = ?", [rec.id]);
  if (!ok) return res.status(400).json({ error: "Invalid OTP" });

  const pwHash = await bcrypt.hash(newPassword, 10);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [pwHash, u.id]);
  await execute("UPDATE password_reset_otps SET consumed_at = NOW() WHERE id = ?", [rec.id]);
  res.json({ ok: true });
});

export default r;
