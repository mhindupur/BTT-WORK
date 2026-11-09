import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeWhatsAppDigits, sendAuthOtpWhatsApp } from "../services/whatsapp.js";

const r = Router();

async function findUserForLogin(loginRaw) {
  const raw = String(loginRaw || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  let user = await queryOne(
    "SELECT id, email, password_hash, role, full_name, phone, is_active FROM users WHERE email = ?",
    [lower]
  );
  if (user) return user;
  // Site Manager may log in with Site Code (alphanumeric)
  const siteCode = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (siteCode.length >= 8 && siteCode.length <= 10) {
    user = await queryOne(
      `SELECT u.id, u.email, u.password_hash, u.role, u.full_name, u.phone, u.is_active
       FROM users u
       JOIN site_managers sm ON sm.user_id = u.id
       JOIN clients c ON c.id = sm.client_id
       WHERE u.role = 'site_manager' AND c.site_code = ?
       LIMIT 1`,
      [siteCode]
    );
  }
  return user || null;
}

async function buildLoginPayload(user) {
  const token = jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
  let clientId = null;
  let siteManagerId = null;
  let assignedClientIds = [];
  if (user.role === "site_manager") {
    const sm = await queryOne("SELECT id, client_id FROM site_managers WHERE user_id = ?", [user.id]);
    if (sm) {
      siteManagerId = sm.id;
      clientId = sm.client_id;
    }
  } else if (user.role === "account_manager") {
    const rows = await query(
      "SELECT client_id FROM client_account_managers WHERE user_id = ? ORDER BY client_id",
      [user.id]
    );
    assignedClientIds = rows.map((r) => Number(r.client_id));
  }
  return {
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
      assigned_client_ids: assignedClientIds,
    },
  };
}

r.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email/site code and password required" });
  }
  const user = await findUserForLogin(email);
  if (!user || !user.is_active) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  // Admin: require external OTP step (WhatsApp) when phone is configured
  if (user.role === "admin") {
    if (!user.phone) {
      // No phone on admin — allow password-only but flag for setup
      return res.json({ ...(await buildLoginPayload(user)), otp_required: false });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const ttl = Number(process.env.AUTH_OTP_TTL_MINUTES || 10);
    const expires = new Date(Date.now() + ttl * 60 * 1000);
    const e164 = normalizeWhatsAppDigits(user.phone);
    await execute(
      "INSERT INTO password_reset_otps (user_id, phone_e164, otp_hash, expires_at) VALUES (?,?,?,?)",
      [user.id, e164 || String(user.phone), otpHash, expires]
    );
    await sendAuthOtpWhatsApp(user.phone, otp, { callbackData: `admin_login_otp:${user.id}` });
    const payload = {
      otp_required: true,
      admin_login_pending: true,
      user_id: user.id,
      phone_hint: String(user.phone).replace(/.(?=.{4})/g, "•"),
      message: "OTP sent to admin WhatsApp. Enter OTP to complete sign-in.",
    };
    // Local/stub only: surface OTP so operators can complete login without WhatsApp
    if ((process.env.WHATSAPP_PROVIDER || "stub").toLowerCase() === "stub") {
      payload.dev_otp = otp;
    }
    return res.json(payload);
  }

  res.json(await buildLoginPayload(user));
});

/** Complete admin login after OTP verification. Body: { user_id, otp } */
r.post("/verify-admin-otp", async (req, res) => {
  const userId = Number(req.body?.user_id);
  const otp = String(req.body?.otp || "").trim();
  if (!userId || !otp) return res.status(400).json({ error: "user_id and otp required" });
  const user = await queryOne(
    "SELECT id, email, password_hash, role, full_name, phone, is_active FROM users WHERE id = ? AND role = 'admin'",
    [userId]
  );
  if (!user || !user.is_active) return res.status(401).json({ error: "Invalid OTP" });
  const row = await queryOne(
    `SELECT id, otp_hash, expires_at, consumed_at FROM password_reset_otps
     WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  if (!row || row.consumed_at) return res.status(400).json({ error: "Invalid or expired OTP" });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: "OTP expired" });
  }
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  if (hash !== row.otp_hash) return res.status(400).json({ error: "Invalid OTP" });
  await execute("UPDATE password_reset_otps SET consumed_at = NOW() WHERE id = ?", [row.id]);
  res.json(await buildLoginPayload(user));
});

r.get("/me", requireAuth, async (req, res) => {
  const user = await queryOne(
    "SELECT id, email, role, full_name, phone FROM users WHERE id = ?",
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: "Not found" });
  let clientId = null;
  let siteManagerId = null;
  let assignedClientIds = [];
  if (user.role === "site_manager") {
    const sm = await queryOne("SELECT id, client_id FROM site_managers WHERE user_id = ?", [
      user.id,
    ]);
    if (sm) {
      siteManagerId = sm.id;
      clientId = sm.client_id;
    }
  } else if (user.role === "account_manager") {
    const rows = await query(
      "SELECT client_id FROM client_account_managers WHERE user_id = ? ORDER BY client_id",
      [user.id]
    );
    assignedClientIds = rows.map((r) => Number(r.client_id));
  }
  res.json({
    ...user,
    client_id: clientId,
    site_manager_id: siteManagerId,
    assigned_client_ids: assignedClientIds,
  });
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
