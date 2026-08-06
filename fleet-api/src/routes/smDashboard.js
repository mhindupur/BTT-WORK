import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireSiteManager } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireSiteManager);

function n(row, key = "c") {
  return Number(row?.[key] || 0);
}

r.get("/summary", async (req, res) => {
  const sm = await queryOne("SELECT id, client_id, location_label FROM site_managers WHERE user_id = ?", [
    req.user.id,
  ]);
  if (!sm) return res.status(400).json({ error: "Site manager profile missing" });

  const client = await queryOne("SELECT id, name FROM clients WHERE id = ?", [sm.client_id]);

  const vehicleScope = `(
    v.submitted_by_site_manager_id = ?
    OR v.id IN (SELECT vehicle_id FROM vehicle_site_managers WHERE site_manager_id = ?)
  )`;

  const totalVehicles = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles v WHERE ${vehicleScope}`,
    [sm.id, sm.id]
  );
  const approved = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles v WHERE ${vehicleScope} AND v.approval_status='approved' AND v.is_active=1`,
    [sm.id, sm.id]
  );
  const pendingReview = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles v WHERE ${vehicleScope} AND v.approval_status='pending_review'`,
    [sm.id, sm.id]
  );
  const draft = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles v WHERE ${vehicleScope} AND v.approval_status='draft'`,
    [sm.id, sm.id]
  );
  const rejected = await queryOne(
    `SELECT COUNT(*) AS c FROM vehicles v WHERE ${vehicleScope} AND v.approval_status='rejected'`,
    [sm.id, sm.id]
  );

  const pendingIndents = await queryOne(
    "SELECT COUNT(*) AS c FROM indents WHERE site_manager_id = ? AND status = 'pending'",
    [sm.id]
  );
  const utilizedIndents = await queryOne(
    "SELECT COUNT(*) AS c FROM indents WHERE site_manager_id = ? AND status = 'utilized'",
    [sm.id]
  );
  const serialsAvailable = await queryOne(
    "SELECT COUNT(*) AS c FROM indent_serial_pool WHERE site_manager_id = ? AND status = 'available'",
    [sm.id]
  );

  const rejectedDocs = await query(
    `SELECT vd.id, vd.doc_type, vd.rejection_note, vd.original_filename, vd.reviewed_at,
            v.id AS vehicle_id, v.registration_number
     FROM vehicle_documents vd
     JOIN vehicles v ON v.id = vd.vehicle_id
     WHERE vd.status = 'rejected'
       AND (
         v.submitted_by_site_manager_id = ?
         OR v.id IN (SELECT vehicle_id FROM vehicle_site_managers WHERE site_manager_id = ?)
       )
     ORDER BY vd.reviewed_at DESC, vd.id DESC
     LIMIT 20`,
    [sm.id, sm.id]
  );

  const rejectedVehicles = await query(
    `SELECT v.id, v.registration_number, v.rejection_note, v.reviewed_at, v.approval_status
     FROM vehicles v
     WHERE ${vehicleScope} AND v.approval_status = 'rejected'
     ORDER BY v.reviewed_at DESC, v.id DESC
     LIMIT 10`,
    [sm.id, sm.id]
  );

  const attentionVehicles = await query(
    `SELECT v.id, v.registration_number, v.approval_status, v.rejection_note,
            (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.status='rejected') AS rejected_docs
     FROM vehicles v
     WHERE ${vehicleScope}
       AND (
         v.approval_status = 'rejected'
         OR EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.status='rejected')
       )
     ORDER BY v.updated_at DESC
     LIMIT 15`,
    [sm.id, sm.id]
  );

  const recentIndents = await query(
    `SELECT i.id, i.serial_number, i.amount_rs, i.status, i.created_at, v.registration_number
     FROM indents i
     JOIN vehicles v ON v.id = i.vehicle_id
     WHERE i.site_manager_id = ?
     ORDER BY i.id DESC
     LIMIT 8`,
    [sm.id]
  );

  res.json({
    profile: {
      site_manager_id: sm.id,
      location_label: sm.location_label,
      client_name: client?.name || null,
    },
    totals: {
      vehicles: n(totalVehicles),
      approved: n(approved),
      pending_review: n(pendingReview),
      draft: n(draft),
      rejected: n(rejected),
      pending_indents: n(pendingIndents),
      utilized_indents: n(utilizedIndents),
      serials_available: n(serialsAvailable),
      rejected_documents: rejectedDocs.length,
    },
    rejected_documents: rejectedDocs,
    rejected_vehicles: rejectedVehicles,
    attention_vehicles: attentionVehicles,
    recent_indents: recentIndents,
  });
});

export default r;
