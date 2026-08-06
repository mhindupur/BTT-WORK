import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

function n(row, key = "c") {
  return Number(row?.[key] || 0);
}

async function expiryBucket(column) {
  const valid = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles
     WHERE approval_status = 'approved' AND is_active = 1
       AND ${column} IS NOT NULL AND ${column} >= CURDATE()`
  );
  const expired = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles
     WHERE approval_status = 'approved' AND is_active = 1
       AND ${column} IS NOT NULL AND ${column} < CURDATE()`
  );
  const missing = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles
     WHERE approval_status = 'approved' AND is_active = 1 AND ${column} IS NULL`
  );
  return { valid: n(valid), expired: n(expired), missing: n(missing) };
}

r.get("/summary", async (_req, res) => {
  const clients = await queryOne("SELECT COUNT(*) AS c FROM clients");
  const vehicles = await queryOne("SELECT COUNT(*) AS c FROM vehicles");
  const uniqueRegs = await queryOne("SELECT COUNT(DISTINCT registration_number) AS c FROM vehicles");
  const activeApproved = await queryOne(
    "SELECT COUNT(*) AS c FROM vehicles WHERE approval_status = 'approved' AND is_active = 1"
  );
  const pendingReview = await queryOne(
    "SELECT COUNT(*) AS c FROM vehicles WHERE approval_status = 'pending_review'"
  );
  const draft = await queryOne("SELECT COUNT(*) AS c FROM vehicles WHERE approval_status = 'draft'");
  const rejected = await queryOne("SELECT COUNT(*) AS c FROM vehicles WHERE approval_status = 'rejected'");
  const indentsPending = await queryOne(
    "SELECT COUNT(*) AS c FROM indents WHERE status = 'pending'"
  );
  const reconAlerts = await queryOne(
    "SELECT COUNT(*) AS c FROM fuel_recon_lines WHERE alert_message IS NOT NULL"
  );
  const siteManagers = await queryOne("SELECT COUNT(*) AS c FROM site_managers");

  const byFuel = await query(
    `SELECT COALESCE(NULLIF(TRIM(fuel_type), ''), 'Unknown') AS label, COUNT(*) AS value
     FROM vehicles GROUP BY label ORDER BY value DESC`
  );
  const byModel = await query(
    `SELECT COALESCE(NULLIF(TRIM(make_model), ''), 'Unknown') AS label, COUNT(*) AS value
     FROM vehicles GROUP BY label ORDER BY value DESC LIMIT 12`
  );
  const byApproval = await query(
    `SELECT approval_status AS label, COUNT(*) AS value
     FROM vehicles GROUP BY approval_status ORDER BY value DESC`
  );
  const byClient = await query(
    `SELECT c.name AS label, COUNT(v.id) AS value
     FROM clients c
     LEFT JOIN vehicles v ON v.client_id = c.id
     GROUP BY c.id, c.name
     ORDER BY value DESC
     LIMIT 12`
  );

  const insurance = await expiryBucket("insurance_expiry");
  const fitness = await expiryBucket("fitness_expiry");
  const roadTax = await expiryBucket("tax_expiry");
  const puc = await expiryBucket("puc_expiry");
  const permit = await expiryBucket("permit_expiry");

  const recent = await query(
    `SELECT i.id, i.serial_number, i.amount_rs, i.status, v.registration_number, u.full_name AS site_manager_name
     FROM indents i
     JOIN vehicles v ON v.id = i.vehicle_id
     JOIN site_managers sm ON sm.id = i.site_manager_id
     JOIN users u ON u.id = sm.user_id
     ORDER BY i.id DESC LIMIT 15`
  );
  const mismatches = await query(
    `SELECT l.id, l.vehicle_registration, l.filled_amount_rs, l.variance_rs, l.alert_message, fu.created_at
     FROM fuel_recon_lines l
     JOIN fuel_recon_uploads fu ON fu.id = l.upload_id
     WHERE l.alert_message IS NOT NULL
     ORDER BY l.id DESC LIMIT 10`
  );
  const pendingVehicles = await query(
    `SELECT v.id, v.registration_number, v.submitted_at, c.name AS client_name, u.full_name AS submitted_by_name
     FROM vehicles v
     JOIN clients c ON c.id = v.client_id
     LEFT JOIN site_managers sm ON sm.id = v.submitted_by_site_manager_id
     LEFT JOIN users u ON u.id = sm.user_id
     WHERE v.approval_status = 'pending_review'
     ORDER BY v.submitted_at DESC
     LIMIT 10`
  );

  res.json({
    totals: {
      clients: n(clients),
      vehicles: n(vehicles),
      unique_vehicles: n(uniqueRegs),
      active_approved: n(activeApproved),
      pending_review: n(pendingReview),
      draft: n(draft),
      rejected: n(rejected),
      site_managers: n(siteManagers),
      active_indents_pending: n(indentsPending),
      fuel_recon_alerts: n(reconAlerts),
      insurance_expired: insurance.expired,
      fitness_expired: fitness.expired,
      tax_expired: roadTax.expired,
      puc_expired: puc.expired,
      permit_expired: permit.expired,
    },
    charts: {
      by_fuel: byFuel.map((r) => ({ label: r.label, value: n(r, "value") })),
      by_model: byModel.map((r) => ({ label: r.label, value: n(r, "value") })),
      by_approval: byApproval.map((r) => ({ label: r.label, value: n(r, "value") })),
      by_client: byClient.map((r) => ({ label: r.label, value: n(r, "value") })),
    },
    expiry: {
      insurance,
      fitness,
      road_tax: roadTax,
      puc,
      permit,
    },
    recent_indents: recent,
    mismatch_alerts: mismatches,
    pending_vehicles: pendingVehicles,
  });
});

export default r;
