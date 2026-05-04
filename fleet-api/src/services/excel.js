import XLSX from "xlsx";

export function parseSheetRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) return { headers: [], data: [] };
  const headers = rows[0].map((h) => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === "" || c == null)) continue;
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    data.push(obj);
  }
  return { headers, data };
}

function cell(obj, ...keys) {
  for (const k of keys) {
    const kk = k.toLowerCase().replace(/\s+/g, "_");
    for (const [key, val] of Object.entries(obj)) {
      if (key.toLowerCase().replace(/\s+/g, "_") === kk) return val;
    }
  }
  return undefined;
}

export function rowVehicleReg(r) {
  return String(
    cell(r, "vehicle", "vehicle_number", "registration", "vehicle_registration", "reg_no", "reg") || ""
  )
    .trim()
    .toUpperCase();
}

export function rowAmount(r) {
  const v = cell(r, "amount", "filled_amount", "fuel_filled", "amount_rs", "total", "rs");
  if (v == null || v === "") return null;
  return Number(String(v).replace(/,/g, ""));
}

export function rowSerial(r) {
  const v = cell(r, "serial", "serial_number", "indent_serial");
  return v != null && v !== "" ? String(v).trim() : null;
}

export function paymentRowMap(r) {
  return {
    vehicle_registration: rowVehicleReg(r),
    owner_name: cell(r, "owner_name", "owner", "driver_name", "name"),
    owner_mobile: String(cell(r, "mobile", "phone", "owner_mobile", "contact") || "").replace(/\s/g, ""),
    trip_count: cell(r, "trip_count", "trips", "no_of_trips", "no of trips")
      ? Number(cell(r, "trip_count", "trips", "no_of_trips", "no of trips"))
      : null,
    fuel_advance_rs: cell(r, "fuel_advance", "fuel_advance_rs")
      ? Number(String(cell(r, "fuel_advance", "fuel_advance_rs")).replace(/,/g, ""))
      : null,
    other_deductions_rs: cell(r, "other_deductions", "deductions", "emi", "other")
      ? Number(String(cell(r, "other_deductions", "deductions", "emi", "other")).replace(/,/g, ""))
      : null,
    total_paid_rs: cell(r, "total_paid", "total", "net", "payable")
      ? Number(String(cell(r, "total_paid", "total", "net", "payable")).replace(/,/g, ""))
      : null,
  };
}
