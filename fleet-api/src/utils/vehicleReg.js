/**
 * Canonical form: KA-01-MM-0001 (with optional series) or KA-01-0001 (no series).
 * Accepts spaces/dashes, compact KA01MM0001, or partial series.
 */

function padNum(numStr) {
  const d = String(numStr || "").replace(/\D/g, "");
  if (!d) return null;
  return d.padStart(4, "0").slice(-4);
}

function tryParseDashed(input) {
  const normalized = String(input)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const parts = normalized.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;

  const state = parts[0].replace(/[^A-Z]/g, "").slice(0, 2);
  if (state.length !== 2) return null;

  const dRaw = parts[1].replace(/\D/g, "");
  if (!dRaw) return null;
  const district = dRaw.padStart(2, "0").slice(-2);
  if (!/^\d{2}$/.test(district)) return null;

  if (parts.length === 3) {
    const n = padNum(parts[2]);
    if (!n) return null;
    return `${state}-${district}-${n}`;
  }

  const series = parts[2].replace(/[^A-Z0-9]/g, "").slice(0, 3);
  if (!series) return null;
  const rest = parts.slice(3).join("");
  const n = padNum(rest);
  if (!n) return null;
  return `${state}-${district}-${series}-${n}`;
}

function tryParseCompact(compact) {
  const c = String(compact || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const m = c.match(/^([A-Z]{2})(\d{2})([A-Z]{0,3})(\d{1,4})$/);
  if (!m) return null;
  const [, st, dist, ser, num] = m;
  const n = padNum(num);
  if (!n) return null;
  if (!ser) return `${st}-${dist}-${n}`;
  return `${st}-${dist}-${ser}-${n}`;
}

export function normalizeVehicleRegistration(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;

  const dashed = tryParseDashed(s);
  if (dashed) return dashed;

  const compact = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return tryParseCompact(compact);
}
