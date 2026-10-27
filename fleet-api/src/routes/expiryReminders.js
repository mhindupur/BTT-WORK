import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  listUpcomingExpiries,
  runExpiryReminders,
} from "../services/expiryReminders.js";
import { REMINDER_DAYS_BEFORE } from "../constants/expiryDocs.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/schedule", (_req, res) => {
  res.json({
    days_before: REMINDER_DAYS_BEFORE,
    timezone: process.env.REMINDER_TIMEZONE || "Asia/Kolkata",
    cron_enabled: String(process.env.DOC_REMINDER_CRON_ENABLED || "1").trim() !== "0",
    channel: process.env.WHATSAPP_PROVIDER || "stub",
    notes: [
      "Reminders at 30 days, 15 days, then daily for the last 7 days (including expiry day).",
      "Site manager gets an escalation WhatsApp 1 day before if the renewed document is not yet admin-approved.",
      "Primary recipient is the linked driver (else vehicle owner) for vehicle docs; driver for DL.",
    ],
  });
});

r.get("/upcoming", async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
  res.json(await listUpcomingExpiries(limit));
});

r.get("/history", async (req, res) => {
  const limit = Math.min(300, Math.max(1, Number(req.query.limit || 100)));
  const rows = await query(
    `SELECT * FROM document_expiry_reminders ORDER BY sent_at DESC, id DESC LIMIT ${limit}`
  );
  res.json(rows);
});

r.get("/runs", async (_req, res) => {
  const rows = await query(
    `SELECT * FROM document_reminder_runs ORDER BY started_at DESC, id DESC LIMIT 30`
  );
  res.json(rows);
});

r.post("/run", async (req, res) => {
  const force = Boolean(req.body?.force);
  const result = await runExpiryReminders({ source: "manual", force });
  res.json(result);
});

r.get("/summary", async (_req, res) => {
  const upcoming = await listUpcomingExpiries(50);
  const lastRun = await queryOne(
    `SELECT * FROM document_reminder_runs ORDER BY started_at DESC LIMIT 1`
  );
  const sentToday = await queryOne(
    `SELECT COUNT(*) AS c FROM document_expiry_reminders WHERE DATE(sent_at) = CURDATE() AND status = 'sent'`
  );
  res.json({
    upcoming_count: upcoming.length,
    upcoming: upcoming.slice(0, 20),
    last_run: lastRun,
    sent_today: Number(sentToday?.c || 0),
  });
});

export default r;
