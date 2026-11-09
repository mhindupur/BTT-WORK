/** Local calendar helpers for form validation (Asia/Kolkata-friendly ISO dates). */

export function todayISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** First allowed expiry date: strictly after today. */
export function minExpiryISODate(d = new Date()) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return todayISODate(next);
}

export function isExpiryAfterToday(value, d = new Date()) {
  const v = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return v > todayISODate(d);
}
