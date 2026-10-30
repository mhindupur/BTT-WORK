/**
 * Download rows as an .xlsx file (SheetJS loaded on demand).
 * @param {{ filename: string, sheetName?: string, columns: { header: string, value: (row: any) => any }[], rows: any[] }} opts
 */
export async function downloadExcel({ filename, sheetName = "Sheet1", columns, rows }) {
  const XLSX = await import("xlsx");
  const data = (rows || []).map((row) => {
    const out = {};
    for (const col of columns) {
      let v;
      try {
        v = col.value(row);
      } catch {
        v = "";
      }
      out[col.header] = v == null ? "" : v;
    }
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
  if (!data.length && columns?.length) {
    XLSX.utils.sheet_add_aoa(ws, [columns.map((c) => c.header)], { origin: "A1" });
  }

  const colWidths = (columns || []).map((col) => {
    const headerLen = String(col.header || "").length;
    let max = headerLen;
    for (const row of data) {
      const cell = row[col.header];
      const len = String(cell ?? "").length;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 10), 48) };
  });
  if (colWidths.length) ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Sheet1");
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

/** Safe filename fragment from today's date (local). */
export function excelStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
