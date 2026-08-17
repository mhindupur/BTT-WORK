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
      "INSERT INTO clients (name, site_code, email, phone, address) VALUES (?,?,?,?,?)",
      [clientName, "DEMOC", "demo-client@btt.example", "+919999000001", "Bengaluru, Karnataka"]
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

  const reg = "KA01AB1234";
  let vehicle = await queryOne(
    "SELECT id FROM vehicles WHERE registration_number = ?",
    [reg]
  );
  if (!vehicle) {
    const vr = await execute(
      "INSERT INTO vehicles (client_id, registration_number, vehicle_serial, owner_name, owner_phone) VALUES (?,?,?,?,?)",
      [client.id, reg, "DEMOC0001", "Suresh Patil", "+919988776655"]
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

  // Default vehicle types (Sedan, SUV, TT, Bus, …)
  try {
    const { ensureDefaultVehicleTypes } = await import("./routes/vehicleTypes.js");
    await ensureDefaultVehicleTypes();
    console.log("[seed] Vehicle types ready (Sedan, SUV/MPV, TT/Mini BUS, BUS).");
  } catch (err) {
    console.warn(
      "[seed] Skipped vehicle types (apply fleet-db/migration_005_vehicle_types.sql if table missing):",
      err.message
    );
  }

  const adminUser = await queryOne("SELECT id FROM users WHERE email = ?", [adminEmail]);
  const demoBatch = await queryOne(
    "SELECT id FROM indent_serial_batches WHERE site_manager_id = ? AND description LIKE 'Demo seed%'",
    [sm.id]
  );
  if (adminUser && !demoBatch) {
    try {
      const bres = await execute(
        `INSERT INTO indent_serial_batches (site_manager_id, created_by, prefix, start_number, end_number, digit_width, description)
         VALUES (?,?,?,?,?,?,?)`,
        [sm.id, adminUser.id, "CBL", 1, 10, 4, "Demo seed: CBL0001–CBL0010 for supervisor"]
      );
      const bid = bres.insertId;
      for (let n = 1; n <= 10; n++) {
        const serial = `CBL${String(n).padStart(4, "0")}`;
        await execute(
          `INSERT INTO indent_serial_pool (batch_id, site_manager_id, serial_number) VALUES (?,?,?)`,
          [bid, sm.id, serial]
        );
      }
      console.log("[seed] Issued demo serials CBL0001–CBL0010 to supervisor (admin-issued pool).");
    } catch (err) {
      console.warn(
        "[seed] Skipped demo indent series (apply fleet-db/migration_002_indent_serial_batches.sql if table missing):",
        err.message
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
