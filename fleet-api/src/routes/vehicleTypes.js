import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();

const DEFAULT_TYPES = [
  ["Sedan", "SEDAN", 10],
  ["SUV", "SUV", 20],
  ["Hatchback", "HATCH", 30],
  ["MUV / MPV", "MUV", 40],
  ["Tempo Traveller (TT)", "TT", 50],
  ["Mini Bus", "MINIBUS", 60],
  ["Bus", "BUS", 70],
  ["Van", "VAN", 80],
  ["Truck / LCV", "TRUCK", 90],
  ["Electric Cab", "EV", 100],
  ["Other", "OTHER", 900],
];

/** Ensure known defaults exist (safe to call repeatedly). */
export async function ensureDefaultVehicleTypes() {
  for (const [name, code, sort] of DEFAULT_TYPES) {
    await execute(
      `INSERT INTO vehicle_types (name, code, sort_order)
       SELECT ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = ?)`,
      [name, code, sort, name]
    );
  }
}

/** Active types for dropdowns (admin + site manager). */
r.get("/", requireAuth, async (req, res) => {
  await ensureDefaultVehicleTypes().catch(() => {});
  const activeOnly = String(req.query.all || "") !== "1";
  const rows = await query(
    activeOnly
      ? `SELECT id, name, code, is_active, sort_order FROM vehicle_types
         WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
      : `SELECT id, name, code, is_active, sort_order FROM vehicle_types
         ORDER BY sort_order ASC, name ASC`
  );
  res.json(rows);
});

r.post("/", requireAuth, requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const code = String(req.body?.code || "").trim() || null;
  const sortOrder = Number(req.body?.sort_order ?? 100);
  if (!name) return res.status(400).json({ error: "name required" });
  const exists = await queryOne("SELECT id FROM vehicle_types WHERE name = ?", [name]);
  if (exists) return res.status(409).json({ error: "Vehicle type already exists" });
  const rins = await execute(
    "INSERT INTO vehicle_types (name, code, sort_order, is_active) VALUES (?,?,?,1)",
    [name, code, Number.isFinite(sortOrder) ? sortOrder : 100]
  );
  res.status(201).json(await queryOne("SELECT * FROM vehicle_types WHERE id = ?", [rins.insertId]));
});

r.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const row = await queryOne("SELECT * FROM vehicle_types WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const name = req.body?.name != null ? String(req.body.name).trim() : row.name;
  const code = req.body?.code != null ? String(req.body.code).trim() || null : row.code;
  const sortOrder =
    req.body?.sort_order != null ? Number(req.body.sort_order) : row.sort_order;
  const isActive =
    req.body?.is_active != null ? (req.body.is_active ? 1 : 0) : row.is_active;
  if (!name) return res.status(400).json({ error: "name required" });
  const clash = await queryOne("SELECT id FROM vehicle_types WHERE name = ? AND id <> ?", [
    name,
    row.id,
  ]);
  if (clash) return res.status(409).json({ error: "Vehicle type already exists" });
  await execute(
    "UPDATE vehicle_types SET name=?, code=?, sort_order=?, is_active=? WHERE id=?",
    [name, code, Number.isFinite(sortOrder) ? sortOrder : 100, isActive, row.id]
  );
  // Keep denormalized make_model in sync for vehicles using this type
  await execute("UPDATE vehicles SET make_model = ? WHERE vehicle_type_id = ?", [name, row.id]);
  res.json(await queryOne("SELECT * FROM vehicle_types WHERE id = ?", [row.id]));
});

r.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const row = await queryOne("SELECT * FROM vehicle_types WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const used = await queryOne("SELECT COUNT(*) AS c FROM vehicles WHERE vehicle_type_id = ?", [
    row.id,
  ]);
  if (Number(used?.c || 0) > 0) {
    // Soft-disable instead of hard delete when in use
    await execute("UPDATE vehicle_types SET is_active = 0 WHERE id = ?", [row.id]);
    return res.json({ ok: true, soft_disabled: true });
  }
  await execute("DELETE FROM vehicle_types WHERE id = ?", [row.id]);
  res.status(204).end();
});

export default r;
