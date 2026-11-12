import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();

const DEFAULT_VENDORS = [
  ["MapMyIndia", "MMI", 10],
  ["Fleetx", "FLEETX", 20],
  ["LocoNav", "LOCONAV", 30],
  ["Wheelseye", "WHEEL", 40],
  ["TrackoBit", "TRACKO", 50],
  ["Other", "OTHER", 900],
];

export async function ensureDefaultGpsVendors() {
  for (const [name, code, sort] of DEFAULT_VENDORS) {
    await execute(
      `INSERT INTO gps_vendors (name, code, sort_order)
       SELECT ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM gps_vendors WHERE name = ?)`,
      [name, code, sort, name]
    );
  }
}

/** Active vendors for vehicle form dropdown (admin + site manager). */
r.get("/", requireAuth, async (req, res) => {
  await ensureDefaultGpsVendors().catch(() => {});
  const activeOnly = String(req.query.all || "") !== "1";
  const rows = await query(
    activeOnly
      ? `SELECT id, name, code, is_active, sort_order FROM gps_vendors
         WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
      : `SELECT id, name, code, is_active, sort_order FROM gps_vendors
         ORDER BY sort_order ASC, name ASC`
  );
  res.json(rows);
});

r.post("/", requireAuth, requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const code = String(req.body?.code || "").trim() || null;
  const sortOrder = Number(req.body?.sort_order ?? 100);
  if (!name) return res.status(400).json({ error: "name required" });
  const exists = await queryOne("SELECT id FROM gps_vendors WHERE name = ?", [name]);
  if (exists) return res.status(409).json({ error: "GPS vendor already exists" });
  const rins = await execute(
    "INSERT INTO gps_vendors (name, code, sort_order, is_active) VALUES (?,?,?,1)",
    [name, code, Number.isFinite(sortOrder) ? sortOrder : 100]
  );
  res.status(201).json(await queryOne("SELECT * FROM gps_vendors WHERE id = ?", [rins.insertId]));
});

r.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const row = await queryOne("SELECT * FROM gps_vendors WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const name = req.body?.name != null ? String(req.body.name).trim() : row.name;
  const code = req.body?.code != null ? String(req.body.code).trim() || null : row.code;
  const sortOrder = req.body?.sort_order != null ? Number(req.body.sort_order) : row.sort_order;
  const isActive = req.body?.is_active != null ? (req.body.is_active ? 1 : 0) : row.is_active;
  if (!name) return res.status(400).json({ error: "name required" });
  const clash = await queryOne("SELECT id FROM gps_vendors WHERE name = ? AND id <> ?", [name, row.id]);
  if (clash) return res.status(409).json({ error: "GPS vendor already exists" });
  await execute(
    "UPDATE gps_vendors SET name=?, code=?, sort_order=?, is_active=? WHERE id=?",
    [name, code, Number.isFinite(sortOrder) ? sortOrder : 100, isActive, row.id]
  );
  await execute("UPDATE vehicles SET gps_vendor = ? WHERE gps_vendor_id = ?", [name, row.id]);
  res.json(await queryOne("SELECT * FROM gps_vendors WHERE id = ?", [row.id]));
});

r.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const row = await queryOne("SELECT * FROM gps_vendors WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const used = await queryOne("SELECT COUNT(*) AS c FROM vehicles WHERE gps_vendor_id = ?", [row.id]);
  if (Number(used?.c || 0) > 0) {
    await execute("UPDATE gps_vendors SET is_active = 0 WHERE id = ?", [row.id]);
    return res.json({ ok: true, soft_disabled: true });
  }
  await execute("DELETE FROM gps_vendors WHERE id = ?", [row.id]);
  res.status(204).end();
});

export default r;
