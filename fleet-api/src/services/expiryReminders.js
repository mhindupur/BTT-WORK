import { query, queryOne, execute } from "../db.js";
import {
  DRIVER_EXPIRY_DOCS,
  REMINDER_DAYS_BEFORE,
  VEHICLE_EXPIRY_DOCS,
  formatDaysLeft,
  milestoneForDaysBefore,
} from "../constants/expiryDocs.js";
import { notifyAdmin } from "./notifications.js";
import { sendDocumentReminderWhatsApp } from "./whatsapp.js";

function ymd(d) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function daysBetween(fromYmd, toYmd) {
  const a = new Date(`${fromYmd}T00:00:00Z`);
  const b = new Date(`${toYmd}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function todayYmd() {
  // Prefer Asia/Kolkata for BTT ops; fall back to UTC date if Intl fails.
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.REMINDER_TIMEZONE || "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function alreadySent(row) {
  const existing = await queryOne(
    `SELECT id FROM document_expiry_reminders
     WHERE entity_type = ? AND entity_id = ? AND doc_type = ? AND expiry_date = ?
       AND days_before = ? AND recipient_role = ?`,
    [row.entityType, row.entityId, row.docType, row.expiryDate, row.daysBefore, row.recipientRole]
  );
  return Boolean(existing);
}

async function logReminder(row) {
  try {
    await execute(
      `INSERT INTO document_expiry_reminders (
        entity_type, entity_id, doc_type, doc_label, expiry_date, days_before, milestone,
        recipient_role, recipient_name, recipient_phone, channel, status, error_message, message_preview
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        row.entityType,
        row.entityId,
        row.docType,
        row.docLabel,
        row.expiryDate,
        row.daysBefore,
        row.milestone,
        row.recipientRole,
        row.recipientName || null,
        row.recipientPhone || null,
        row.channel || "whatsapp",
        row.status,
        row.errorMessage || null,
        row.messagePreview || null,
      ]
    );
    return true;
  } catch (err) {
    // Duplicate unique key → already logged for this milestone
    if (String(err?.code || "") === "ER_DUP_ENTRY") return false;
    throw err;
  }
}

function buildMessage({ recipientName, docLabel, entityLabel, timingText, forSiteManager }) {
  if (forSiteManager) {
    return (
      `BTT reminder: ${docLabel} for ${entityLabel} expires ${timingText} ` +
      `(${recipientName || "Driver/owner"} was already notified). ` +
      `Please ensure a renewed document is uploaded and approved by admin.`
    );
  }
  return (
    `Hello ${recipientName || "Team"}, your ${docLabel} for ${entityLabel} expires ${timingText}. ` +
    `Please renew and upload the updated document for admin approval.`
  );
}

async function deliverWhatsApp(candidate) {
  const messagePreview = buildMessage(candidate);
  if (!candidate.recipientPhone) {
    return {
      status: "skipped",
      channel: "whatsapp",
      errorMessage: "missing_phone",
      messagePreview,
    };
  }
  const result = await sendDocumentReminderWhatsApp(
    candidate.recipientPhone,
    {
      recipientName: candidate.recipientName,
      docLabel: candidate.docLabel,
      entityLabel: candidate.entityLabel,
      timingText: candidate.timingText,
    },
    {
      callbackData: `doc:${candidate.entityType}:${candidate.entityId}:${candidate.docType}:${candidate.daysBefore}`,
    }
  );
  if (result.ok) {
    return {
      status: "sent",
      channel: result.channel || "whatsapp",
      messagePreview,
      errorMessage: null,
    };
  }
  return {
    status: "failed",
    channel: result.channel || "whatsapp",
    messagePreview,
    errorMessage: String(result.error || "send_failed").slice(0, 500),
  };
}

/** True when a newer approved document covers this expiry (renewed). */
async function vehicleDocRenewedAndApproved(vehicleId, docType, currentExpiry) {
  const row = await queryOne(
    `SELECT id FROM vehicle_documents
     WHERE vehicle_id = ? AND doc_type = ? AND status = 'approved'
       AND expiry_date IS NOT NULL AND expiry_date > ?
     ORDER BY expiry_date DESC LIMIT 1`,
    [vehicleId, docType, currentExpiry]
  );
  return Boolean(row);
}

async function driverLicenseRenewedAndApproved(driverId, currentExpiry) {
  // Renewed only after admin approval moves a later expiry onto license_expiry.
  const row = await queryOne(
    `SELECT id FROM drivers
     WHERE id = ? AND license_doc_status = 'approved'
       AND license_expiry IS NOT NULL AND license_expiry > ?`,
    [driverId, currentExpiry]
  );
  return Boolean(row);
}

async function collectVehicleCandidates(today) {
  const vehicles = await query(
    `SELECT v.id, v.registration_number, v.owner_name, v.owner_phone, v.client_id,
            v.insurance_expiry, v.fitness_expiry, v.puc_expiry, v.tax_expiry, v.permit_expiry,
            v.form_42_47_expiry, v.form_49_expiry, v.approval_status, v.is_active,
            (SELECT d.full_name FROM drivers d WHERE d.vehicle_id = v.id AND d.is_active = 1 ORDER BY d.id ASC LIMIT 1) AS driver_name,
            (SELECT d.phone FROM drivers d WHERE d.vehicle_id = v.id AND d.is_active = 1 ORDER BY d.id ASC LIMIT 1) AS driver_phone,
            (SELECT u.full_name FROM site_managers sm JOIN users u ON u.id = sm.user_id
              WHERE sm.client_id = v.client_id ORDER BY sm.id ASC LIMIT 1) AS site_manager_name,
            (SELECT u.phone FROM site_managers sm JOIN users u ON u.id = sm.user_id
              WHERE sm.client_id = v.client_id ORDER BY sm.id ASC LIMIT 1) AS site_manager_phone
     FROM vehicles v
     WHERE v.is_active = 1 AND v.approval_status = 'approved'`
  );

  const out = [];
  for (const v of vehicles) {
    for (const doc of VEHICLE_EXPIRY_DOCS) {
      // Prefer latest *approved* document expiry so pending renewals do not silence reminders.
      const approvedDoc = await queryOne(
        `SELECT expiry_date FROM vehicle_documents
         WHERE vehicle_id = ? AND doc_type = ? AND status = 'approved' AND expiry_date IS NOT NULL
         ORDER BY expiry_date DESC, id DESC LIMIT 1`,
        [v.id, doc.docType]
      );
      let expiry = ymd(approvedDoc?.expiry_date);
      if (!expiry && doc.column) expiry = ymd(v[doc.column]);
      if (!expiry && doc.fromDocuments) {
        const anyDoc = await queryOne(
          `SELECT expiry_date FROM vehicle_documents
           WHERE vehicle_id = ? AND doc_type = ? AND expiry_date IS NOT NULL
           ORDER BY expiry_date DESC, id DESC LIMIT 1`,
          [v.id, doc.docType]
        );
        expiry = ymd(anyDoc?.expiry_date);
      }
      if (!expiry) continue;

      const daysBefore = daysBetween(today, expiry);
      if (!REMINDER_DAYS_BEFORE.includes(daysBefore)) continue;

      const renewed = await vehicleDocRenewedAndApproved(v.id, doc.docType, expiry);
      if (renewed) continue;

      const entityLabel = v.registration_number;
      const timingText = formatDaysLeft(daysBefore);
      const milestone = milestoneForDaysBefore(daysBefore);

      // Primary: linked driver, else owner
      const primaryRole = v.driver_phone ? "driver" : "owner";
      const primaryName = v.driver_phone ? v.driver_name : v.owner_name;
      const primaryPhone = v.driver_phone || v.owner_phone;
      out.push({
        entityType: "vehicle",
        entityId: v.id,
        docType: doc.docType,
        docLabel: doc.label,
        expiryDate: expiry,
        daysBefore,
        milestone,
        recipientRole: primaryRole,
        recipientName: primaryName,
        recipientPhone: primaryPhone,
        entityLabel,
        timingText,
        forSiteManager: false,
      });

      // Site manager escalation: 1 day before if still not renewed+approved
      if (daysBefore === 1 && v.site_manager_phone) {
        out.push({
          entityType: "vehicle",
          entityId: v.id,
          docType: doc.docType,
          docLabel: doc.label,
          expiryDate: expiry,
          daysBefore,
          milestone: "sm_escalation",
          recipientRole: "site_manager",
          recipientName: v.site_manager_name,
          recipientPhone: v.site_manager_phone,
          entityLabel,
          timingText,
          forSiteManager: true,
        });
      }
    }
  }
  return out;
}

async function collectDriverCandidates(today) {
  const drivers = await query(
    `SELECT d.id, d.full_name, d.phone, d.license_expiry, d.license_doc_status, d.client_id,
            v.registration_number,
            (SELECT u.full_name FROM site_managers sm JOIN users u ON u.id = sm.user_id
              WHERE sm.client_id = d.client_id ORDER BY sm.id ASC LIMIT 1) AS site_manager_name,
            (SELECT u.phone FROM site_managers sm JOIN users u ON u.id = sm.user_id
              WHERE sm.client_id = d.client_id ORDER BY sm.id ASC LIMIT 1) AS site_manager_phone
     FROM drivers d
     LEFT JOIN vehicles v ON v.id = d.vehicle_id
     WHERE d.is_active = 1 AND d.license_expiry IS NOT NULL`
  );

  const out = [];
  for (const d of drivers) {
    for (const doc of DRIVER_EXPIRY_DOCS) {
      const expiry = ymd(d[doc.column]);
      if (!expiry) continue;
      const daysBefore = daysBetween(today, expiry);
      if (!REMINDER_DAYS_BEFORE.includes(daysBefore)) continue;

      const renewed = await driverLicenseRenewedAndApproved(d.id, expiry);
      if (renewed) continue;

      const entityLabel = d.registration_number
        ? `${d.full_name} (${d.registration_number})`
        : d.full_name;
      const timingText = formatDaysLeft(daysBefore);
      const milestone = milestoneForDaysBefore(daysBefore);

      out.push({
        entityType: "driver",
        entityId: d.id,
        docType: doc.docType,
        docLabel: doc.label,
        expiryDate: expiry,
        daysBefore,
        milestone,
        recipientRole: "driver",
        recipientName: d.full_name,
        recipientPhone: d.phone,
        entityLabel,
        timingText,
        forSiteManager: false,
      });

      if (daysBefore === 1 && d.site_manager_phone) {
        out.push({
          entityType: "driver",
          entityId: d.id,
          docType: doc.docType,
          docLabel: doc.label,
          expiryDate: expiry,
          daysBefore,
          milestone: "sm_escalation",
          recipientRole: "site_manager",
          recipientName: d.site_manager_name,
          recipientPhone: d.site_manager_phone,
          entityLabel,
          timingText,
          forSiteManager: true,
        });
      }
    }
  }
  return out;
}

/**
 * Run the daily expiry reminder pass.
 * @param {{ source?: string, force?: boolean }} opts
 */
export async function runExpiryReminders(opts = {}) {
  const source = opts.source || "cron";
  const today = todayYmd();

  if (!opts.force) {
    const prior = await queryOne(
      `SELECT id FROM document_reminder_runs WHERE run_date = ? AND trigger_source = ? AND finished_at IS NOT NULL`,
      [today, source]
    );
    if (prior) {
      return { ok: true, skipped: true, reason: "already_ran_today", run_date: today };
    }
  }

  const runIns = await execute(
    `INSERT INTO document_reminder_runs (run_date, trigger_source, notes)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE started_at = CURRENT_TIMESTAMP, finished_at = NULL,
       candidates = 0, sent = 0, failed = 0, skipped = 0, notes = VALUES(notes)`,
    [today, source, opts.force ? "forced re-run" : null]
  );

  const vehicleCandidates = await collectVehicleCandidates(today);
  const driverCandidates = await collectDriverCandidates(today);
  const candidates = [...vehicleCandidates, ...driverCandidates];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const c of candidates) {
    if (await alreadySent(c)) {
      skipped += 1;
      continue;
    }
    const delivery = await deliverWhatsApp(c);
    const logged = await logReminder({
      ...c,
      channel: delivery.channel,
      status: delivery.status,
      errorMessage: delivery.errorMessage,
      messagePreview: delivery.messagePreview,
    });
    if (!logged) {
      skipped += 1;
      continue;
    }
    if (delivery.status === "sent") sent += 1;
    else if (delivery.status === "failed") failed += 1;
    else skipped += 1;

    if (delivery.status === "sent" && c.recipientRole !== "admin") {
      await notifyAdmin({
        type: "doc_expiry_reminder",
        title: `${c.docLabel} expires ${c.timingText}`,
        body: delivery.messagePreview,
        entityType: c.entityType,
        entityId: c.entityId,
      }).catch(() => {});
    }
  }

  await execute(
    `UPDATE document_reminder_runs
     SET finished_at = NOW(), candidates = ?, sent = ?, failed = ?, skipped = ?
     WHERE run_date = ? AND trigger_source = ?`,
    [candidates.length, sent, failed, skipped, today, source]
  );

  return {
    ok: true,
    run_date: today,
    candidates: candidates.length,
    sent,
    failed,
    skipped,
    run_id: runIns.insertId || null,
  };
}

export async function listUpcomingExpiries(limit = 100) {
  const today = todayYmd();
  const vehicleRows = await query(
    `SELECT 'vehicle' AS entity_type, v.id AS entity_id, v.registration_number AS entity_label,
            'INS' AS doc_type, 'Insurance' AS doc_label, v.insurance_expiry AS expiry_date
     FROM vehicles v WHERE v.is_active = 1 AND v.insurance_expiry IS NOT NULL
       AND v.insurance_expiry BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
     UNION ALL
     SELECT 'vehicle', v.id, v.registration_number, 'FC', 'Fitness certificate', v.fitness_expiry
     FROM vehicles v WHERE v.is_active = 1 AND v.fitness_expiry IS NOT NULL
       AND v.fitness_expiry BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
     UNION ALL
     SELECT 'vehicle', v.id, v.registration_number, 'PUC', 'PUC / Pollution certificate', v.puc_expiry
     FROM vehicles v WHERE v.is_active = 1 AND v.puc_expiry IS NOT NULL
       AND v.puc_expiry BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
     UNION ALL
     SELECT 'vehicle', v.id, v.registration_number, 'TAX', 'Road tax', v.tax_expiry
     FROM vehicles v WHERE v.is_active = 1 AND v.tax_expiry IS NOT NULL
       AND v.tax_expiry BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
     UNION ALL
     SELECT 'vehicle', v.id, v.registration_number, 'PERMIT', 'Permit', v.permit_expiry
     FROM vehicles v WHERE v.is_active = 1 AND v.permit_expiry IS NOT NULL
       AND v.permit_expiry BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
     UNION ALL
     SELECT 'driver', d.id, d.full_name, 'DL', 'Driving license', d.license_expiry
     FROM drivers d WHERE d.is_active = 1 AND d.license_expiry IS NOT NULL
       AND d.license_expiry BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
     ORDER BY expiry_date ASC
     LIMIT ${Number(limit) || 100}`,
    [
      today, today,
      today, today,
      today, today,
      today, today,
      today, today,
      today, today,
    ]
  );
  return vehicleRows.map((r) => ({
    ...r,
    days_before: daysBetween(today, ymd(r.expiry_date)),
    expiry_date: ymd(r.expiry_date),
  }));
}

/** Start background daily scheduler (no external cron dependency). */
export function startExpiryReminderScheduler() {
  const enabled = String(process.env.DOC_REMINDER_CRON_ENABLED || "1").trim() !== "0";
  if (!enabled) {
    console.log("[expiry-reminders] scheduler disabled (DOC_REMINDER_CRON_ENABLED=0)");
    return;
  }
  const intervalMs = Math.max(
    5 * 60 * 1000,
    Number(process.env.DOC_REMINDER_POLL_MS || 60 * 60 * 1000) || 60 * 60 * 1000
  );
  console.log(`[expiry-reminders] scheduler every ${Math.round(intervalMs / 60000)} min (tz=${process.env.REMINDER_TIMEZONE || "Asia/Kolkata"})`);

  const tick = async () => {
    try {
      const result = await runExpiryReminders({ source: "cron" });
      if (!result.skipped) {
        console.log(
          `[expiry-reminders] run ${result.run_date}: candidates=${result.candidates} sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`
        );
      }
    } catch (err) {
      console.error("[expiry-reminders] tick failed:", err.message);
    }
  };

  // Initial delay so DB/migrations settle after boot
  setTimeout(tick, 15_000);
  setInterval(tick, intervalMs);
}
