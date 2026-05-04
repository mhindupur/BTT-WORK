/** Build canonical reg from parts (matches fleet-api normalization). */

export function padNum(numStr) {
  const d = String(numStr || "").replace(/\D/g, "");
  if (!d) return null;
  return d.padStart(4, "0").slice(-4);
}

export function buildRegistrationFromParts(state, district, series, number) {
  const st = String(state || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
  const dRaw = String(district || "").replace(/\D/g, "");
  if (st.length !== 2 || !dRaw) return null;
  const dist = dRaw.padStart(2, "0").slice(-2);
  if (!/^\d{2}$/.test(dist)) return null;

  const ser = String(series || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  const n = padNum(number);
  if (!n) return null;

  if (ser) return `${st}-${dist}-${ser}-${n}`;
  return `${st}-${dist}-${n}`;
}

export function parseRegistrationToParts(canonical) {
  const u = String(canonical || "").trim().toUpperCase();
  const m4 = u.match(/^([A-Z]{2})-(\d{2})-([A-Z0-9]{1,3})-(\d{1,4})$/);
  if (m4) {
    return {
      state: m4[1],
      district: m4[2],
      series: m4[3],
      number: String(parseInt(m4[4], 10)),
    };
  }
  const m3 = u.match(/^([A-Z]{2})-(\d{2})-(\d{1,4})$/);
  if (m3) {
    return {
      state: m3[1],
      district: m3[2],
      series: "",
      number: String(parseInt(m3[3], 10)),
    };
  }
  return {
    state: "KA",
    district: "",
    series: "",
    number: "",
    unparsed: u,
  };
}

/** Same rules as API — for paste / preview. */
export function normalizeVehicleRegistration(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;

  const normalized = s
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const parts = normalized.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const state = parts[0].replace(/[^A-Z]/g, "").slice(0, 2);
    if (state.length !== 2) return null;
    const dRaw = parts[1].replace(/\D/g, "");
    if (!dRaw) return null;
    const district = dRaw.padStart(2, "0").slice(-2);
    if (parts.length === 3) {
      const n = padNum(parts[2]);
      if (!n) return null;
      return `${state}-${district}-${n}`;
    }
    const series = parts[2].replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (!series) return null;
    const n = padNum(parts.slice(3).join(""));
    if (!n) return null;
    return `${state}-${district}-${series}-${n}`;
  }

  const c = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = c.match(/^([A-Z]{2})(\d{2})([A-Z]{0,3})(\d{1,4})$/);
  if (!m) return null;
  const [, st, dist, ser, num] = m;
  const n = padNum(num);
  if (!n) return null;
  if (!ser) return `${st}-${dist}-${n}`;
  return `${st}-${dist}-${ser}-${n}`;
}
