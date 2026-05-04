import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin, requireSiteManager } from "../middleware/auth.js";

const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get("/", async (_req, res) => {
  const rows = await query(
    `SELECT v.*, c.name AS client_name,
      (SELECT GROUP_CONCAT(u.full_name) FROM vehicle_site_managers vsm
        JOIN site_managers sm ON sm.id = vsm.site_manager_id
        JOIN users u ON u.id = sm.user_id WHERE vsm.vehicle_id = v.id) AS site_manager_names
     FROM vehicles v JOIN clients c ON c.id = v.client_id ORDER BY v.id DESC`
  );
  res.json(rows);
});

admin.post("/", async (req, res) => {
  const { client_id, registration_number, owner_name, owner_phone, notes, site_manager_ids } =
    req.body || {};
  if (!client_id || !registration_number) {
    return res.status(400).json({ error: "client_id and registration_number required" });
  }
  const reg = String(registration_number).trim().toUpperCase();
  const result = await execute(
    "INSERT INTO vehicles (client_id, registration_number, owner_name, owner_phone, notes) VALUES (?,?,?,?,?)",
    [client_id, reg, owner_name || null, owner_phone || null, notes || null]
  );
  const vid = result.insertId;
  if (Array.isArray(site_manager_ids)) {
    for (const smid of site_manager_ids) {
      await execute(
        "INSERT IGNORE INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)",
        [vid, smid]
      );
    }
  }
  const row = await queryOne("SELECT * FROM vehicles WHERE id = ?", [vid]);
  res.status(201).json(row);
});

admin.patch("/:id", async (req, res) => {
  const { owner_name, owner_phone, notes, site_manager_ids } = req.body || {};
  await execute(
    "UPDATE vehicles SET owner_name = COALESCE(?, owner_name), owner_phone = COALESCE(?, owner_phone), notes = COALESCE(?, notes) WHERE id = ?",
    [owner_name ?? null, owner_phone ?? null, notes ?? null, req.params.id]
  );
  if (Array.isArray(site_manager_ids)) {
    await execute("DELETE FROM vehicle_site_managers WHERE vehicle_id = ?", [req.params.id]);
    for (const smid of site_manager_ids) {
      await execute(
        "INSERT INTO vehicle_site_managers (vehicle_id, site_manager_id) VALUES (?,?)",
        [req.params.id, smid]
      );
    }
  }
  const row = await queryOne("SELECT * FROM vehicles WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
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
