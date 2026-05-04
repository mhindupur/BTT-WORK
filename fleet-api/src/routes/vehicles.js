import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin, requireSiteManager } from "../middleware/auth.js";
import { normalizeVehicleRegistration } from "../utils/vehicleReg.js";

const VEHICLE_ADMIN_ROW = `SELECT v.*, c.name AS client_name,
  (SELECT GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR ', ') FROM vehicle_site_managers vsm
    JOIN site_managers sm ON sm.id = vsm.site_manager_id
    JOIN users u ON u.id = sm.user_id WHERE vsm.vehicle_id = v.id) AS site_manager_names,
  (SELECT MIN(vsm2.site_manager_id) FROM vehicle_site_managers vsm2 WHERE vsm2.vehicle_id = v.id) AS site_manager_id
 FROM vehicles v JOIN clients c ON c.id = v.client_id`;

const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get("/", async (_req, res) => {
  const rows = await query(`${VEHICLE_ADMIN_ROW} ORDER BY v.id DESC`);
  res.json(rows);
});

async function assertSmBelongsToClient(siteManagerIds, clientId) {
  for (const smid of siteManagerIds) {
    const sm = await queryOne("SELECT id, client_id FROM site_managers WHERE id = ?", [smid]);
    if (!sm) return { error: "Site manager not found", status: 404 };
    if (Number(sm.client_id) !== Number(clientId)) {
      return { error: "Site manager must belong to the selected client", status: 400 };
    }
  }
  return null;
}

admin.post("/", async (req, res) => {
  const { client_id, registration_number, owner_name, owner_phone, notes, site_manager_id, site_manager_ids } =
    req.body || {};
  if (!client_id) {
    return res.status(400).json({ error: "client_id required" });
  }
  const cid = Number(client_id);
  if (registration_number == null || String(registration_number).trim() === "") {
    return res.status(400).json({ error: "Vehicle registration is required" });
  }
  const reg = normalizeVehicleRegistration(registration_number);
  if (!reg) {
    return res.status(400).json({
      error:
        "Invalid vehicle number. Examples: KA-01-MM-0001, KA 01 MM 0001, KA-01-0001 (no series), or KA01MM0001",
    });
  }
  const dup = await queryOne(
    "SELECT id FROM vehicles WHERE client_id = ? AND registration_number = ?",
    [cid, reg]
  );
  if (dup) return res.status(409).json({ error: "Registration already exists for this client" });

  let smIds = [];
  if (site_manager_id != null && site_manager_id !== "") {
    smIds = [Number(site_manager_id)];
  } else if (Array.isArray(site_manager_ids)) {
    smIds = site_manager_ids.map(Number).filter(Boolean);
  }

  const smErr = await assertSmBelongsToClient(smIds, cid);
  if (smErr) return res.status(smErr.status).json({ error: smErr.error });

  const result = await execute(
    "INSERT INTO vehicles (client_id, registration_number, owner_name, owner_phone, notes) VALUES (?,?,?,?,?)",
    [cid, reg, owner_name || null, owner_phone || null, notes || null]
  );
  const vid = result.insertId;
  for (const smid of smIds) {
    await execute(
      "INSERT IGNORE INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)",
      [vid, smid]
    );
  }
  const row = await queryOne(`${VEHICLE_ADMIN_ROW} WHERE v.id = ?`, [vid]);
  res.status(201).json(row);
});

admin.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await queryOne("SELECT * FROM vehicles WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const body = req.body || {};
  let client_id = existing.client_id;
  let registration_number = existing.registration_number;

  if (body.client_id !== undefined && body.client_id !== null && body.client_id !== "") {
    client_id = Number(body.client_id);
  }

  if (
    body.registration_number !== undefined &&
    body.registration_number !== null &&
    String(body.registration_number).trim() !== ""
  ) {
    const reg = normalizeVehicleRegistration(body.registration_number);
    if (!reg) {
      return res.status(400).json({
        error:
          "Invalid vehicle number. Examples: KA-01-MM-0001, KA-01-0001, or KA01MM0001",
      });
    }
    registration_number = reg;
  }

  const dup = await queryOne(
    "SELECT id FROM vehicles WHERE client_id = ? AND registration_number = ? AND id <> ?",
    [client_id, registration_number, id]
  );
  if (dup) return res.status(409).json({ error: "Registration already exists for this client" });

  let owner_name = existing.owner_name;
  let owner_phone = existing.owner_phone;
  let notes = existing.notes;
  if ("owner_name" in body) owner_name = body.owner_name ? String(body.owner_name) : null;
  if ("owner_phone" in body) owner_phone = body.owner_phone ? String(body.owner_phone) : null;
  if ("notes" in body) notes = body.notes ? String(body.notes) : null;

  await execute(
    "UPDATE vehicles SET client_id = ?, registration_number = ?, owner_name = ?, owner_phone = ?, notes = ? WHERE id = ?",
    [client_id, registration_number, owner_name, owner_phone, notes, id]
  );

  const assignSm =
    Object.prototype.hasOwnProperty.call(body, "site_manager_id") ||
    Array.isArray(body.site_manager_ids);

  if (assignSm) {
    await execute("DELETE FROM vehicle_site_managers WHERE vehicle_id = ?", [id]);
    let smIds = [];
    if (body.site_manager_id != null && body.site_manager_id !== "") {
      smIds = [Number(body.site_manager_id)];
    } else if (Array.isArray(body.site_manager_ids)) {
      smIds = body.site_manager_ids.map(Number).filter(Boolean);
    }
    const smErr = await assertSmBelongsToClient(smIds, client_id);
    if (smErr) return res.status(smErr.status).json({ error: smErr.error });
    for (const smid of smIds) {
      await execute(
        "INSERT INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)",
        [id, smid]
      );
    }
  }

  const row = await queryOne(`${VEHICLE_ADMIN_ROW} WHERE v.id = ?`, [id]);
  res.json(row);
});

admin.delete("/:id", async (req, res) => {
  await execute("DELETE FROM vehicles WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

/** Site manager: vehicles assigned to them */
const sm = Router();
sm.use(requireAuth, requireSiteManager);

sm.get("/mine", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const rows = await query(
    `SELECT v.*, c.name AS client_name FROM vehicles v
     JOIN vehicle_site_managers vsm ON vsm.vehicle_id = v.id
     JOIN clients c ON c.id = v.client_id
     WHERE vsm.site_manager_id = ?
     ORDER BY v.registration_number`,
    [smRow.id]
  );
  res.json(rows);
});

/** Last 30 days indents for vehicle (all site managers) — safeguard panel */
sm.get("/:vehicleId/indent-history", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const access = await queryOne(
    "SELECT 1 FROM vehicle_site_managers WHERE vehicle_id = ? AND site_manager_id = ?",
    [req.params.vehicleId, smRow.id]
  );
  if (!access) return res.status(403).json({ error: "Vehicle not assigned to you" });
  const rows = await query(
    `SELECT i.id, i.serial_number, i.amount_rs, i.status, i.created_at,
            u.full_name AS issued_by_name
     FROM indents i
     JOIN site_managers sm ON sm.id = i.site_manager_id
     JOIN users u ON u.id = sm.user_id
     WHERE i.vehicle_id = ? AND i.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     ORDER BY i.created_at DESC`,
    [req.params.vehicleId]
  );
  const sumRow = await queryOne(
    `SELECT COALESCE(SUM(amount_rs),0) AS total_rs, COUNT(*) AS cnt FROM indents
     WHERE vehicle_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status != 'cancelled'`,
    [req.params.vehicleId]
  );
  res.json({ indents: rows, summary: sumRow });
});

export { admin as vehiclesAdmin, sm as vehiclesSm };
