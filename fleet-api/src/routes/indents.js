import { Router } from "express";
import multer from "multer";
import path from "path";
import { query, queryOne, execute, pool } from "../db.js";
import { requireAuth, requireAdmin, requireSiteManager } from "../middleware/auth.js";

const upload = multer({ dest: path.join(process.env.UPLOAD_DIR || "./uploads", "indents") });

const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get("/", async (_req, res) => {
  const rows = await query(
    `SELECT i.*, v.registration_number, u.full_name AS site_manager_name
     FROM indents i
     JOIN vehicles v ON v.id = i.vehicle_id
     JOIN site_managers sm ON sm.id = i.site_manager_id
     JOIN users u ON u.id = sm.user_id
     ORDER BY i.id DESC LIMIT 500`
  );
  res.json(rows);
});

admin.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "utilized", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  await execute("UPDATE indents SET status = ? WHERE id = ?", [status, req.params.id]);
  const row = await queryOne("SELECT * FROM indents WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

const sm = Router();
sm.use(requireAuth, requireSiteManager);

/** Serials admin issued to this site manager that are still available */
sm.get("/available-serials", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const rows = await query(
    `SELECT p.id, p.serial_number, p.batch_id, b.prefix, b.description AS batch_description
     FROM indent_serial_pool p
     JOIN indent_serial_batches b ON b.id = p.batch_id
     WHERE p.site_manager_id = ? AND p.status = 'available'
     ORDER BY p.serial_number`,
    [smRow.id]
  );
  res.json(rows);
});

sm.get("/mine", async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const rows = await query(
    `SELECT i.*, v.registration_number FROM indents i
     JOIN vehicles v ON v.id = i.vehicle_id
     WHERE i.site_manager_id = ?
     ORDER BY i.id DESC LIMIT 200`,
    [smRow.id]
  );
  res.json(rows);
});

sm.post("/", upload.single("photo"), async (req, res) => {
  const smRow = await queryOne("SELECT id FROM site_managers WHERE user_id = ?", [req.user.id]);
  if (!smRow) return res.status(400).json({ error: "Site manager profile missing" });
  const { serial_number, vehicle_id, amount_rs } = req.body || {};
  if (!serial_number || !vehicle_id || amount_rs == null) {
    return res.status(400).json({ error: "serial_number, vehicle_id, amount_rs required" });
  }
  const serialNorm = String(serial_number).trim().toUpperCase();

  const access = await queryOne(
    `SELECT v.approval_status, v.is_active
     FROM vehicle_site_managers vsm
     JOIN vehicles v ON v.id = vsm.vehicle_id
     WHERE vsm.vehicle_id = ? AND vsm.site_manager_id = ?`,
    [vehicle_id, smRow.id]
  );
  if (!access) return res.status(403).json({ error: "Vehicle not assigned to you" });
  if (access.approval_status !== "approved" || !Number(access.is_active)) {
    return res.status(403).json({
      error:
        "Vehicle is not approved by BTT admin yet. You cannot assign/issue work until documents and vehicle details are approved.",
    });
  }

  const imagePath = req.file ? `/uploads/indents/${req.file.filename}` : null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [poolRows] = await conn.execute(
      `SELECT id FROM indent_serial_pool
       WHERE serial_number = ? AND site_manager_id = ? AND status = 'available' FOR UPDATE`,
      [serialNorm, smRow.id]
    );
    if (!poolRows.length) {
      await conn.rollback();
      return res.status(400).json({
        error:
          "Serial is not in your admin-issued pool, or it was already used. Ask admin to assign a series (e.g. CBL0001–CBL0100).",
      });
    }
    const poolRowId = poolRows[0].id;

    const [insResult] = await conn.execute(
      `INSERT INTO indents (serial_number, vehicle_id, site_manager_id, amount_rs, status, image_path)
       VALUES (?,?,?,?, 'pending', ?)`,
      [serialNorm, vehicle_id, smRow.id, Number(amount_rs), imagePath]
    );
    const indentId = insResult.insertId;

    await conn.execute(
      `UPDATE indent_serial_pool SET status = 'consumed', indent_id = ?, consumed_at = NOW() WHERE id = ?`,
      [indentId, poolRowId]
    );

    await conn.commit();
    const row = await queryOne("SELECT * FROM indents WHERE id = ?", [indentId]);
    res.status(201).json(row);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

export { admin as indentsAdmin, sm as indentsSm };
