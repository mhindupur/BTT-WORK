import { Router } from "express";
import multer from "multer";
import path from "path";
import { query, queryOne, execute } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { parseSheetRows, rowVehicleReg, rowAmount, rowSerial } from "../services/excel.js";

const upload = multer({ storage: multer.memoryStorage() });
const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/uploads", async (_req, res) => {
  const rows = await query(
    `SELECT u.id, u.original_filename, u.created_at, usr.full_name AS uploaded_by_name
     FROM fuel_recon_uploads u JOIN users usr ON usr.id = u.uploaded_by ORDER BY u.id DESC LIMIT 100`
  );
  res.json(rows);
});

r.get("/uploads/:id/lines", async (req, res) => {
  const rows = await query(
    `SELECT l.*,
       COALESCE(NULLIF(TRIM(l.indent_serial), ''), i.serial_number) AS indent_number,
       i.serial_number AS matched_serial
     FROM fuel_recon_lines l
     LEFT JOIN indents i ON i.id = l.matched_indent_id
     WHERE l.upload_id = ? ORDER BY l.id`,
    [req.params.id]
  );
  res.json(rows);
});

r.post("/uploads", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  const { data } = parseSheetRows(req.file.buffer);
  const ures = await execute(
    "INSERT INTO fuel_recon_uploads (uploaded_by, original_filename) VALUES (?,?)",
    [req.user.id, req.file.originalname]
  );
  const uploadId = ures.insertId;
  const alerts = [];
  for (const row of data) {
    const reg = rowVehicleReg(row);
    const amt = rowAmount(row);
    const serial = rowSerial(row);
    if (!reg || amt == null || Number.isNaN(amt)) continue;
    let matchedIndentId = null;
    let variance = null;
    let alertMsg = null;
    let indentSerial = serial || null;
    if (serial) {
      const ind = await queryOne(
        `SELECT id, amount_rs, status, serial_number FROM indents WHERE serial_number = ? AND status = 'pending'`,
        [serial]
      );
      if (ind) {
        matchedIndentId = ind.id;
        indentSerial = ind.serial_number || serial;
        variance = Number(ind.amount_rs) - amt;
        if (Math.abs(variance) > 0.01) {
          alertMsg = `Serial ${serial}: issued Rs ${ind.amount_rs} | fuel filled Rs ${amt} | diff Rs ${variance}`;
          alerts.push(alertMsg);
        }
        await execute("UPDATE indents SET status = 'utilized' WHERE id = ?", [ind.id]);
      } else {
        alertMsg = `No pending indent found for serial ${serial}`;
        alerts.push(alertMsg);
      }
    } else {
      const ind = await queryOne(
        `SELECT id, amount_rs, serial_number FROM indents i
         JOIN vehicles v ON v.id = i.vehicle_id
         WHERE v.registration_number = ? AND i.status = 'pending'
         ORDER BY i.created_at DESC LIMIT 1`,
        [reg]
      );
      if (ind) {
        matchedIndentId = ind.id;
        indentSerial = ind.serial_number || null;
        variance = Number(ind.amount_rs) - amt;
        if (Math.abs(variance) > 0.01) {
          alertMsg = `${reg}: issued Rs ${ind.amount_rs} | filled Rs ${amt} | diff Rs ${variance}`;
          alerts.push(alertMsg);
        }
        await execute("UPDATE indents SET status = 'utilized' WHERE id = ?", [ind.id]);
      }
    }
    await execute(
      `INSERT INTO fuel_recon_lines (upload_id, vehicle_registration, indent_serial, filled_amount_rs, matched_indent_id, variance_rs, alert_message, raw_row)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        uploadId,
        reg,
        indentSerial,
        amt,
        matchedIndentId,
        variance,
        alertMsg,
        JSON.stringify(row),
      ]
    );
  }
  res.status(201).json({ upload_id: uploadId, alerts_count: alerts.length, alerts: alerts.slice(0, 20) });
});

export default r;
