/** Document types watched by the expiry reminder scheduler. */

export const VEHICLE_EXPIRY_DOCS = [
  { docType: "RC", label: "Vehicle RC book", column: null, fromDocuments: true },
  { docType: "INS", label: "Insurance", column: "insurance_expiry" },
  { docType: "FC", label: "Fitness certificate", column: "fitness_expiry" },
  { docType: "PUC", label: "PUC / Pollution certificate", column: "puc_expiry" },
  { docType: "TAX", label: "Road tax", column: "tax_expiry" },
  { docType: "PERMIT", label: "Permit", column: "permit_expiry" },
  { docType: "FORM_42_47", label: "Form 42 / 47", column: "form_42_47_expiry" },
  { docType: "FORM_49", label: "Form 49", column: "form_49_expiry" },
];

export const DRIVER_EXPIRY_DOCS = [
  { docType: "DL", label: "Driving license", column: "license_expiry" },
];

/**
 * Reminder cadence:
 * - 30 days (1 month)
 * - 15 days
 * - daily for the last 7 days (7…1) and on expiry day (0)
 */
export const REMINDER_DAYS_BEFORE = [30, 15, 7, 6, 5, 4, 3, 2, 1, 0];

export function milestoneForDaysBefore(days) {
  const d = Number(days);
  if (d === 30) return "1_month";
  if (d === 15) return "15_days";
  if (d === 7) return "1_week";
  if (d >= 0 && d <= 6) return "daily";
  return `d_${d}`;
}

export function formatDaysLeft(days) {
  const d = Number(days);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow (1 day)";
  if (d === 7) return "in 1 week (7 days)";
  if (d === 15) return "in 15 days";
  if (d === 30) return "in 1 month (30 days)";
  return `in ${d} days`;
}
