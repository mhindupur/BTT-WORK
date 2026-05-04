import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/summary", async (_req, res) => {
  const clients = await queryOne("SELECT COUNT(*) AS c FROM clients");
  const vehicles = await queryOne("SELECT COUNT(*) AS c FROM vehicles");
  const indentsPending = await queryOne(
    "SELECT COUNT(*) AS c FROM indents WHERE status = 'pending'"
  );
  const reconAlerts = await queryOne(
    "SELECT COUNT(*) AS c FROM fuel_recon_lines WHERE alert_message IS NOT NULL"
  );
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
  res.json({
    totals: {
      clients: clients.c,
      vehicles: vehicles.c,
      active_indents_pending: indentsPending.c,
      fuel_recon_alerts: reconAlerts.c,
    },
    recent_indents: recent,
    mismatch_alerts: mismatches,
  });
});

export default r;
