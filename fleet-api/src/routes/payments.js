import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { parseSheetRows, paymentRowMap } from "../services/excel.js";
import { sendPaymentLinkWhatsApp } from "../services/whatsapp.js";

const upload = multer({ storage: multer.memoryStorage() });

const admin = Router();
admin.use(requireAuth, requireAdmin);

/** Non-secret WhatsApp config for admin UI */
admin.get("/whatsapp-config", (_req, res) => {
  const provider = (process.env.WHATSAPP_PROVIDER || "stub").toLowerCase();
  const interakt = {
    configured: !!(process.env.INTERAKT_API_KEY && process.env.INTERAKT_TEMPLATE_NAME),
    template: process.env.INTERAKT_TEMPLATE_NAME || null,
    api_url: process.env.INTERAKT_API_URL || "https://api.interakt.ai/v1/public/message/",
  };
  const meta = {
    configured: !!(
      process.env.META_WHATSAPP_PHONE_NUMBER_ID &&
      process.env.META_WHATSAPP_ACCESS_TOKEN &&
      process.env.META_WHATSAPP_TEMPLATE_NAME
    ),
    template: process.env.META_WHATSAPP_TEMPLATE_NAME || null,
    phone_number_id_set: !!process.env.META_WHATSAPP_PHONE_NUMBER_ID,
  };
  res.json({
    provider,
    public_web_origin: (process.env.PUBLIC_WEB_ORIGIN || "http://localhost:5174").replace(/\/$/, ""),
    interakt,
    meta,
  });
});

admin.post("/uploads", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  const period_label = req.body?.period_label || null;
  const { data } = parseSheetRows(req.file.buffer);
  const bres = await execute(
    "INSERT INTO payment_batches (uploaded_by, period_label, original_filename) VALUES (?,?,?)",
    [req.user.id, period_label, req.file.originalname]
  );
  const batchId = bres.insertId;
  const base = (process.env.PUBLIC_WEB_ORIGIN || "http://localhost:5174").replace(/\/$/, "");
  const provider = (process.env.WHATSAPP_PROVIDER || "stub").toLowerCase();
  let whatsapp_sent = 0;
  let whatsapp_failed = 0;
  /** @type {{ mobile?: string, error?: string }[]} */
  const whatsapp_errors = [];
  for (const row of data) {
    const m = paymentRowMap(row);
    if (!m.vehicle_registration) continue;
    const token = uuidv4();
    const ins = await execute(
      `INSERT INTO payment_lines (batch_id, vehicle_registration, owner_name, owner_mobile, trip_count,
        fuel_advance_rs, other_deductions_rs, total_paid_rs, public_token, raw_row)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        batchId,
        m.vehicle_registration,
        m.owner_name || null,
        m.owner_mobile || null,
        m.trip_count,
        m.fuel_advance_rs,
        m.other_deductions_rs,
        m.total_paid_rs,
        token,
        JSON.stringify(row),
      ]
    );
    const lineId = ins.insertId;
    if (m.owner_mobile) {
      const payUrl = `${base}/pay/${token}`;
      const result = await sendPaymentLinkWhatsApp(m.owner_mobile, payUrl, {
        vehicle: m.vehicle_registration,
      });
      if (result.ok) {
        await execute("UPDATE payment_lines SET whatsapp_sent_at = NOW() WHERE id = ?", [lineId]);
        whatsapp_sent++;
      } else {
        whatsapp_failed++;
        if (whatsapp_errors.length < 15) {
          whatsapp_errors.push({ mobile: m.owner_mobile, error: result.error || "send_failed" });
        }
      }
    }
  }
  res.status(201).json({
    batch_id: batchId,
    whatsapp_provider: provider,
    whatsapp_sent,
    whatsapp_failed,
    whatsapp_errors,
    whatsapp_stub_sent: whatsapp_sent,
  });
});

admin.get("/batches", async (_req, res) => {
  const rows = await query(
    `SELECT b.*, u.full_name AS uploaded_by_name,
      (SELECT COUNT(*) FROM payment_lines pl WHERE pl.batch_id = b.id) AS line_count
     FROM payment_batches b JOIN users u ON u.id = b.uploaded_by ORDER BY b.id DESC`
  );
  res.json(rows);
});

admin.get("/lines", async (req, res) => {
  const batchId = req.query.batch_id;
  if (!batchId) return res.status(400).json({ error: "batch_id query required" });
  const rows = await query(
    `SELECT id, vehicle_registration, owner_name, owner_mobile, trip_count, fuel_advance_rs,
            other_deductions_rs, total_paid_rs, public_token, owner_viewed_at, whatsapp_sent_at
     FROM payment_lines WHERE batch_id = ?`,
    [batchId]
  );
  res.json(rows);
});

const publicR = Router();

publicR.get("/:token", async (req, res) => {
  const line = await queryOne(
    `SELECT pl.*, b.period_label FROM payment_lines pl
     JOIN payment_batches b ON b.id = pl.batch_id WHERE pl.public_token = ?`,
    [req.params.token]
  );
  if (!line) return res.status(404).json({ error: "Not found" });
  res.json({
    vehicle_registration: line.vehicle_registration,
    owner_name: line.owner_name,
    period_label: line.period_label,
    trip_count: line.trip_count,
    fuel_advance_rs: line.fuel_advance_rs,
    other_deductions_rs: line.other_deductions_rs,
    total_paid_rs: line.total_paid_rs,
    already_viewed: !!line.owner_viewed_at,
  });
});

publicR.post("/:token/viewed", async (req, res) => {
  await execute("UPDATE payment_lines SET owner_viewed_at = COALESCE(owner_viewed_at, NOW()) WHERE public_token = ?", [
    req.params.token,
  ]);
  const line = await queryOne("SELECT owner_viewed_at FROM payment_lines WHERE public_token = ?", [
    req.params.token,
  ]);
  if (!line) return res.status(404).json({ error: "Not found" });
  res.json({ viewed_at: line.owner_viewed_at, message: "Payment Received. This page has been viewed and recorded." });
});

publicR.post("/:token/query", async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });
  const line = await queryOne("SELECT id FROM payment_lines WHERE public_token = ?", [req.params.token]);
  if (!line) return res.status(404).json({ error: "Not found" });
  await execute("INSERT INTO payment_line_queries (line_id, message) VALUES (?,?)", [line.id, message]);
  console.log("[Accounts team] payment query", line.id, message);
  res.json({ ok: true });
});

export { admin as paymentsAdmin, publicR as paymentsPublic };
