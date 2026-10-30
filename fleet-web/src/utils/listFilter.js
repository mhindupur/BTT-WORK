/** Case-insensitive substring match across selected fields. */
export function matchSearch(row, query, fields) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = fields
    .map((f) => {
      if (typeof f === "function") {
        try {
          return f(row);
        } catch {
          return "";
        }
      }
      return row?.[f];
    })
    .filter((v) => v != null && v !== "")
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/** Unique sorted string options from rows for a select filter. */
export function uniqueOptions(rows, getter, { emptyLabel = "All", includeEmpty = false } = {}) {
  const set = new Set();
  for (const row of rows || []) {
    let v;
    try {
      v = typeof getter === "function" ? getter(row) : row?.[getter];
    } catch {
      v = null;
    }
    if (v == null || v === "") {
      if (includeEmpty) set.add("");
      continue;
    }
    set.add(String(v));
  }
  const opts = [...set].sort((a, b) => a.localeCompare(b)).map((v) => ({
    value: v,
    label: v === "" ? "(blank)" : v,
  }));
  return [{ value: "", label: emptyLabel }, ...opts];
}
