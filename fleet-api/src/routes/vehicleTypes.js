import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();

const DEFAULT_TYPES = [
  ["Sedan", "SEDAN", 4, 10],
  ["SUV/MPV", "SUVMPV", 7, 20],
  ["TT/Mini BUS", "TTMINIBUS", 12, 30],
  ["BUS", "BUS", 40, 40],
];

function parsePassengerCount(raw) {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return Math.trunc(n);
}

/** Ensure known defaults exist (safe to call repeatedly). */
export async function ensureDefaultVehicleTypes() {
  for (const [name, code, pax, sort] of DEFAULT_TYPES) {
    await execute(
      `INSERT INTO vehicle_types (name, code, passenger_count, sort_order)
       SELECT ?, ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = ?)`,
      [name, code, pax, sort, name]
    );
    await execute(
      `UPDATE vehicle_types SET passenger_count = COALESCE(passenger_count, ?) WHERE name = ?`,
      [pax, name]
    );
  }
}

/** Active types for dropdowns (admin + site manager). */
r.get("/", requireAuth, async (req, res) => {
  await ensureDefaultVehicleTypes().catch(() => {});
  const activeOnly = String(req.query.all || "") !== "1";
  const rows = await query(
    activeOnly
      ? `SELECT id, name, code, passenger_count, is_active, sort_order FROM vehicle_types
         WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
      : `SELECT id, name, code, passenger_count, is_active, sort_order FROM vehicle_types
         ORDER BY sort_order ASC, name ASC`
  );
  res.json(rows);
});

r.post("/", requireAuth, requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const code = String(req.body?.code || "").trim() || null;
  const passengerCount = parsePassengerCount(req.body?.passenger_count);
  const sortOrder = Number(req.body?.sort_order ?? 100);
  if (!name) return res.status(400).json({ error: "name required" });
  if (passengerCount == null) {
    return res.status(400).json({ error: "passenger_count required (1–100)" });
  }
  const exists = await queryOne("SELECT id FROM vehicle_types WHERE name = ?", [name]);
  if (exists) return res.status(409).json({ error: "Vehicle type already exists" });
  const rins = await execute(
    "INSERT INTO vehicle_types (name, code, passenger_count, sort_order, is_active) VALUES (?,?,?,?,1)",
    [name, code, passengerCount, Number.isFinite(sortOrder) ? sortOrder : 100]
  );
  res.status(201).json(await queryOne("SELECT * FROM vehicle_types WHERE id = ?", [rins.insertId]));
});

r.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const row = await queryOne("SELECT * FROM vehicle_types WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  const name = req.body?.name != null ? String(req.body.name).trim() : row.name;
  const code = req.body?.code != null ? String(req.body.code).trim() || null : row.code;
  const passengerCount =
    req.body?.passenger_count !== undefined
      ? parsePassengerCount(req.body.passenger_count)
      : row.passenger_count;
  const sortOrder =
    req.body?.sort_order != null ? Number(req.body.sort_order) : row.sort_order;
  const isActive =
    req.body?.is_active != null ? (req.body.is_active ? 1 : 0) : row.is_active;
  if (!name) return res.status(400).json({ error: "name required" });
  if (req.body?.passenger_count !== undefined && passengerCount == null) {
    return res.status(400).json({ error: "passenger_count must be 1–100" });
  }
  const clash = await queryOne("SELECT id FROM vehicle_types WHERE name = ? AND id <> ?", [
    name,
    row.id,
  ]);
  if (clash) return res.status(409).json({ error: "Vehicle type already exists" });
  await execute(
    "UPDATE vehicle_types SET name=?, code=?, passenger_count=?, sort_order=?, is_active=? WHERE id=?",
    [
      name,
      code,
      passengerCount,
      Number.isFinite(sortOrder) ? sortOrder : 100,
      isActive,
      row.id,
    ]
  );
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
    await execute("UPDATE vehicle_types SET is_active = 0 WHERE id = ?", [row.id]);
    return res.json({ ok: true, soft_disabled: true });
  }
  await execute("DELETE FROM vehicle_types WHERE id = ?", [row.id]);
  res.status(204).end();
});

export default r;
