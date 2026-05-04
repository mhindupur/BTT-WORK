import "dotenv/config";
import bcrypt from "bcryptjs";
import { execute, queryOne } from "./db.js";

/**
 * Idempotent demo seed (proposal: Admin + Site Manager / Supervisor).
 * Run after `fleet-db/schema.sql` is applied to database `btt_fleet`.
 */
async function ensureUser(email, password, role, fullName, phone = null) {
  const normalized = email.trim().toLowerCase();
  const existing = await queryOne("SELECT id FROM users WHERE email = ?", [normalized]);
  if (existing) return existing.id;
  const hash = await bcrypt.hash(password, 10);
  const r = await execute(
    "INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?,?,?,?,?)",
    [normalized, hash, role, fullName, phone]
  );
  return r.insertId;
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@btt.fleet").trim().toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "Admin@123";
  const smEmail = (process.env.DEMO_SM_EMAIL || "supervisor@btt.fleet").trim().toLowerCase();
  const smPass = process.env.DEMO_SM_PASSWORD || "Supervisor@123";

  await ensureUser(adminEmail, adminPass, "admin", "BTT Administrator");
  console.log("[seed] Admin login:", adminEmail, "/", adminPass);

  const clientName = "Demo Client (BTT)";
  let client = await queryOne("SELECT id FROM clients WHERE name = ?", [clientName]);
  if (!client) {
    const cr = await execute(
      "INSERT INTO clients (name, email, phone, address) VALUES (?,?,?,?)",
      [clientName, "demo-client@btt.example", "+919999000001", "Bengaluru, Karnataka"]
    );
    client = { id: cr.insertId };
  }
  console.log("[seed] Demo client id:", client.id);

  const smUserId = await ensureUser(
    smEmail,
    smPass,
    "site_manager",
    "Demo Site Supervisor",
    "+919999000002"
  );
  let sm = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [smUserId]);
  if (!sm) {
    const smr = await execute(
      "INSERT INTO site_managers (user_id, client_id, location_label) VALUES (?,?,?)",
      [smUserId, client.id, "Plant A — Demo site"]
    );
    sm = { id: smr.insertId };
  }
  console.log("[seed] Supervisor / Site manager login:", smEmail, "/", smPass);

  const reg = "KA-01-AB-1234";
  let vehicle = await queryOne(
    "SELECT id FROM vehicles WHERE client_id = ? AND registration_number = ?",
    [client.id, reg]
  );
  if (!vehicle) {
    const vr = await execute(
      "INSERT INTO vehicles (client_id, registration_number, owner_name, owner_phone) VALUES (?,?,?,?)",
      [client.id, reg, "Suresh Patil", "+919988776655"]
    );
    vehicle = { id: vr.insertId };
  }

  const link = await queryOne(
    "SELECT 1 AS ok FROM vehicle_site_managers WHERE vehicle_id = ? AND site_manager_id = ?",
    [vehicle.id, sm.id]
  );
  if (!link) {
    await execute(
      "INSERT INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)",
      [vehicle.id, sm.id]
    );
  }
  console.log("[seed] Vehicle", reg, "assigned to supervisor for indent demo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
