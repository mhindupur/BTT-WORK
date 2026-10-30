import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

const MAX_RANGE = 5000;

function normalizePrefix(p) {
  return String(p || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function buildSerial(prefix, num, width) {
  return `${prefix}${String(num).padStart(width, "0")}`;
}

r.get("/", async (_req, res) => {
  const rows = await query(
    `SELECT b.*, u.full_name AS site_manager_name,
      (SELECT COUNT(*) FROM indent_serial_pool p WHERE p.batch_id = b.id AND p.status = 'available') AS available_count,
      (SELECT COUNT(*) FROM indent_serial_pool p WHERE p.batch_id = b.id AND p.status = 'consumed') AS consumed_count
     FROM indent_serial_batches b
     JOIN site_managers sm ON sm.id = b.site_manager_id
     JOIN users u ON u.id = sm.user_id
     ORDER BY b.id DESC`
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  let { site_manager_id, prefix, start_number, end_number, digit_width, description } = req.body || {};
  prefix = normalizePrefix(prefix);
  if (!prefix) return res.status(400).json({ error: "prefix required (letters/numbers only)" });
  site_manager_id = Number(site_manager_id);
  start_number = parseInt(start_number, 10);
  end_number = parseInt(end_number, 10);
  if (!site_manager_id || Number.isNaN(start_number) || Number.isNaN(end_number)) {
    return res.status(400).json({ error: "site_manager_id, start_number, end_number required" });
  }
  if (start_number > end_number) {
    return res.status(400).json({ error: "start_number must be <= end_number" });
  }
  const count = end_number - start_number + 1;
  if (count > MAX_RANGE) {
    return res.status(400).json({ error: `Range too large (max ${MAX_RANGE} serials)` });
  }
  const sm = await queryOne("SELECT id FROM site_managers WHERE id = ?", [site_manager_id]);
  if (!sm) return res.status(404).json({ error: "Site manager not found" });

  let width = digit_width != null ? parseInt(digit_width, 10) : null;
  if (!width || width < 1 || width > 12) {
    width = Math.max(4, String(end_number).length, String(start_number).length);
  }

  const serials = [];
  for (let n = start_number; n <= end_number; n++) {
    serials.push(buildSerial(prefix, n, width));
  }

  if (serials.length) {
    const ph = serials.map(() => "?").join(",");
    const dupPool = await query(`SELECT serial_number FROM indent_serial_pool WHERE serial_number IN (${ph})`, serials);
    const dupInd = await query(`SELECT serial_number FROM indents WHERE serial_number IN (${ph})`, serials);
    const conflicts = [...dupPool.map((r) => r.serial_number), ...dupInd.map((r) => r.serial_number)];
    if (conflicts.length) {
      return res.status(409).json({
        error: "Some serials already exist in the system",
        conflicts: conflicts.slice(0, 50),
      });
    }
  }

  const bres = await execute(
    `INSERT INTO indent_serial_batches (site_manager_id, created_by, prefix, start_number, end_number, digit_width, description)
     VALUES (?,?,?,?,?,?,?)`,
    [site_manager_id, req.user.id, prefix, start_number, end_number, width, description || null]
  );
  const batchId = bres.insertId;

  const chunk = 250;
  for (let i = 0; i < serials.length; i += chunk) {
    const part = serials.slice(i, i + chunk);
    const placeholders = part.map(() => "(?,?,?)").join(",");
    const params = part.flatMap((s) => [batchId, site_manager_id, s]);
    await execute(
      `INSERT INTO indent_serial_pool (batch_id, site_manager_id, serial_number) VALUES ${placeholders}`,
      params
    );
  }

  const row = await queryOne(
    `SELECT b.*, u.full_name AS site_manager_name FROM indent_serial_batches b
     JOIN site_managers sm ON sm.id = b.site_manager_id
     JOIN users u ON u.id = sm.user_id WHERE b.id = ?`,
    [batchId]
  );
  res.status(201).json({ ...row, serials_created: serials.length, sample: serials.slice(0, 3) });
});

export default r;
