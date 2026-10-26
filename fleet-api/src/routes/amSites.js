import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireAccountManager } from "../middleware/auth.js";
import { SLA_SELECT } from "../utils/vehicleSla.js";

const r = Router();
r.use(requireAuth, requireAccountManager);

async function assignedClientIds(userId) {
  const rows = await query(
    "SELECT client_id FROM client_account_managers WHERE user_id = ? ORDER BY client_id",
    [userId]
  );
  return rows.map((row) => Number(row.client_id));
}

function assertAssigned(ids, clientId) {
  const cid = Number(clientId);
  if (!cid || !ids.includes(cid)) {
    return { error: "Site not assigned to you", status: 403 };
  }
  return null;
}

/** Sites assigned to this account manager */
r.get("/sites", async (req, res) => {
  const ids = await assignedClientIds(req.user.id);
  if (!ids.length) return res.json([]);
  const ph = ids.map(() => "?").join(",");
  const rows = await query(
    `SELECT c.id, c.name, c.site_code, c.email, c.phone, c.address, c.latitude, c.longitude,
       c.start_date, c.vendor_type, c.sla_max_age_years, c.created_at,
       TIMESTAMPDIFF(YEAR, c.start_date, CURDATE()) AS site_age_years,
       (SELECT COUNT(*) FROM vehicles v WHERE v.client_id = c.id) AS vehicle_count,
       (SELECT COUNT(*) FROM site_managers sm WHERE sm.client_id = c.id) AS site_manager_count
     FROM clients c
     WHERE c.id IN (${ph})
     ORDER BY c.name`,
    ids
  );
  res.json(rows);
});

/** Vehicles for assigned sites (read-only). Optional ?client_id= filter */
r.get("/vehicles", async (req, res) => {
  const ids = await assignedClientIds(req.user.id);
  if (!ids.length) return res.json([]);

  let filterIds = ids;
  const qClient = req.query.client_id;
  if (qClient != null && String(qClient).trim() !== "") {
    const err = assertAssigned(ids, qClient);
    if (err) return res.status(err.status).json({ error: err.error });
    filterIds = [Number(qClient)];
  }

  const ph = filterIds.map(() => "?").join(",");
  const rows = await query(
    `SELECT v.id, v.client_id, v.registration_number, v.vehicle_serial, v.owner_name, v.owner_phone,
       v.ownership, v.make_model, v.vehicle_type_id, v.fuel_type, v.seating_capacity,
       v.registration_date, v.manufacture_year, v.is_active, v.approval_status,
       c.name AS client_name, ${SLA_SELECT}, vt.name AS vehicle_type_name,
       (SELECT GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR ', ')
          FROM vehicle_site_managers vsm
          JOIN site_managers sm ON sm.id = vsm.site_manager_id
          JOIN users u ON u.id = sm.user_id
         WHERE vsm.vehicle_id = v.id) AS site_manager_names
     FROM vehicles v
     JOIN clients c ON c.id = v.client_id
     LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
     WHERE v.client_id IN (${ph})
     ORDER BY v.id DESC`,
    filterIds
  );
  res.json(rows);
});

/** Lightweight dashboard counts */
r.get("/dashboard", async (req, res) => {
  const ids = await assignedClientIds(req.user.id);
  if (!ids.length) {
    return res.json({ sites: 0, vehicles: 0, pending_review: 0, sla_exceeded: 0 });
  }
  const ph = ids.map(() => "?").join(",");
  const sites = ids.length;
  const veh = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles WHERE client_id IN (${ph})`,
    ids
  );
  const pending = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles WHERE client_id IN (${ph}) AND approval_status = 'pending_review'`,
    ids
  );
  const sla = await queryOne(
    `SELECT COUNT(*) AS c
     FROM vehicles v
     JOIN clients c ON c.id = v.client_id
     WHERE v.client_id IN (${ph})
       AND c.sla_max_age_years IS NOT NULL AND c.sla_max_age_years > 0
       AND COALESCE(v.registration_date, IF(v.manufacture_year IS NULL, NULL, STR_TO_DATE(CONCAT(v.manufacture_year,'-01-01'), '%Y-%m-%d'))) IS NOT NULL
       AND TIMESTAMPDIFF(YEAR,
         COALESCE(v.registration_date, STR_TO_DATE(CONCAT(v.manufacture_year,'-01-01'), '%Y-%m-%d')),
         CURDATE()) >= c.sla_max_age_years`,
    ids
  );
  res.json({
    sites,
    vehicles: Number(veh?.c || 0),
    pending_review: Number(pending?.c || 0),
    sla_exceeded: Number(sla?.c || 0),
  });
});

export default r;
