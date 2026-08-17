/**
 * Canonical vehicle number: CAPS, no hyphen/space. Example: KA01MM1234
 * Accepts pasted values with dashes or spaces and strips them.
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

export function normalizeSiteCode(input) {
  const c = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  return c.length === 5 ? c : null;
}
