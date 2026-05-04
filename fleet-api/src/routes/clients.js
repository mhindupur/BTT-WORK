import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/", async (_req, res) => {
  const rows = await query(
    "SELECT id, name, email, phone, address, created_at FROM clients ORDER BY id DESC"
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  const { name, email, phone, address } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const result = await execute(
    "INSERT INTO clients (name, email, phone, address) VALUES (?,?,?,?)",
    [name, email || null, phone || null, address || null]
  );
  const row = await queryOne("SELECT * FROM clients WHERE id = ?", [result.insertId]);
  res.status(201).json(row);
});

r.patch("/:id", async (req, res) => {
  const { name, email, phone, address } = req.body || {};
  await execute(
    "UPDATE clients SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?",
    [name ?? null, email ?? null, phone ?? null, address ?? null, req.params.id]
  );
  const row = await queryOne("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

r.delete("/:id", async (req, res) => {
  await execute("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

export default r;
