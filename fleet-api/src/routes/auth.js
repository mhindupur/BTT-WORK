import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { queryOne } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

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

export default r;
