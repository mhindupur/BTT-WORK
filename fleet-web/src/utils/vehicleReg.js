/**
 * Canonical vehicle number: CAPS, no hyphen/space. Example: KA01MM1234
 */

function padNum(numStr) {
  const d = String(numStr || "").replace(/\D/g, "");
  if (!d) return null;
  return d.padStart(4, "0").slice(-4);
}

export function normalizeVehicleRegistration(input) {
  if (input == null) return null;
  const compact = String(input)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;
  const m = compact.match(/^([A-Z]{2})(\d{2})([A-Z]{0,3})(\d{1,4})$/);
  if (!m) return null;
  const n = padNum(m[4]);
  if (!n) return null;
  return `${m[1]}${m[2]}${m[3]}${n}`;
}

export function formatRegInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
}

export function normalizeSiteCode(input) {
  const c = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  return c.length === 5 ? c : null;
}

export function formatSiteCodeInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

export function clientLabel(c) {
  if (!c) return "";
  return c.site_code ? `${c.name} (${c.site_code})` : c.name;
}

export function vehicleAgeYears(registrationDate, manufactureYear, asOf = new Date()) {
  let start = null;
  if (registrationDate) {
    const s = String(registrationDate).slice(0, 10);
    start = new Date(`${s}T00:00:00`);
  } else if (manufactureYear) {
    start = new Date(Number(manufactureYear), 0, 1);
  }
  if (!start || Number.isNaN(start.getTime())) return null;
  let years = asOf.getFullYear() - start.getFullYear();
  const m = asOf.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < start.getDate())) years -= 1;
  return years;
}

export function isSlaExceeded(row) {
  if (row?.sla_exceeded === true || row?.sla_exceeded === 1) return true;
  const sla = row?.sla_max_age_years;
  if (sla == null || sla === "" || Number(sla) <= 0) return false;
  const age = vehicleAgeYears(row.registration_date, row.manufacture_year);
  return age != null && age >= Number(sla);
}
