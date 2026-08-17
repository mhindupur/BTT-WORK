import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/", async (req, res) => {
  const unreadOnly = String(req.query.unread || "") === "1";
  res.json(
    await query(
      `SELECT * FROM admin_notifications
       ${unreadOnly ? "WHERE is_read = 0" : ""}
       ORDER BY id DESC LIMIT 100`
    )
  );
});

r.get("/unread-count", async (_req, res) => {
  const row = await queryOne("SELECT COUNT(*) AS c FROM admin_notifications WHERE is_read = 0");
  res.json({ count: Number(row?.c || 0) });
});

r.post("/:id/read", async (req, res) => {
  await execute("UPDATE admin_notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
  const row = await queryOne("SELECT * FROM admin_notifications WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

r.post("/read-all", async (_req, res) => {
  await execute("UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0");
  res.json({ ok: true });
});

export default r;
