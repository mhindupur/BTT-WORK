/**
 * Shared vehicle create/update field helpers used by admin + site-manager routes.
 * Keeps route files focused on HTTP / auth / persistence.
 */

import { queryOne } from "../db.js";

export async function resolveVehicleType(body, existing = {}) {
  let typeId =
    body.vehicle_type_id != null && body.vehicle_type_id !== ""
      ? Number(body.vehicle_type_id)
      : existing.vehicle_type_id != null
        ? Number(existing.vehicle_type_id)
        : null;
  if (Object.prototype.hasOwnProperty.call(body, "vehicle_type_id") && (body.vehicle_type_id === "" || body.vehicle_type_id == null)) {
    typeId = null;
  }
  let makeModel = existing.make_model ?? null;
  if (Object.prototype.hasOwnProperty.call(body, "make_model")) {
    makeModel = body.make_model === "" || body.make_model == null ? null : String(body.make_model);
  }
  if (typeId) {
    const t = await queryOne("SELECT id, name FROM vehicle_types WHERE id = ? AND is_active = 1", [typeId]);
    if (!t) return { error: "Invalid vehicle type", status: 400 };
    typeId = t.id;
    makeModel = t.name;
  }
  return { vehicle_type_id: typeId, make_model: makeModel };
}

/** Resolve GPS vendor master id; keep gps_vendor text in sync with vendor name. */
export async function resolveGpsVendor(body, existing = {}, gpsInstalled) {
  if (!gpsInstalled) {
    return { gps_vendor_id: null, gps_vendor: null };
  }
  const hasId = Object.prototype.hasOwnProperty.call(body, "gps_vendor_id");
  let vendorId = hasId
    ? body.gps_vendor_id === "" || body.gps_vendor_id == null
      ? null
      : Number(body.gps_vendor_id)
    : existing.gps_vendor_id != null
      ? Number(existing.gps_vendor_id)
      : null;
  if (vendorId != null && !Number.isFinite(vendorId)) {
    return { error: "Invalid GPS vendor", status: 400 };
  }
  if (vendorId) {
    const v = await queryOne("SELECT id, name FROM gps_vendors WHERE id = ? AND is_active = 1", [vendorId]);
    if (!v) return { error: "Invalid GPS vendor", status: 400 };
    return { gps_vendor_id: v.id, gps_vendor: v.name };
  }
  let gpsVendor = existing.gps_vendor ?? null;
  if (Object.prototype.hasOwnProperty.call(body, "gps_vendor")) {
    gpsVendor = body.gps_vendor === "" || body.gps_vendor == null ? null : String(body.gps_vendor);
  }
  return { gps_vendor_id: null, gps_vendor: gpsVendor };
}

const VEHICLE_STRING_FIELDS = [
  "owner_name",
  "owner_phone",
  "driver_name",
  "driver_phone",
  "ownership",
  "make_model",
  "fuel_type",
  "sub_vendor",
  "sub_vendor_phone",
  "contractual_name",
  "contractual_phone",
  "account_holder_name",
  "account_number",
  "account_ifsc",
  "account_bank_name",
  "engine_number",
  "chassis_number",
  "ac_type",
  "gps_imei",
  "gps_vendor",
  "insurance_expiry",
  "fitness_expiry",
  "puc_expiry",
  "tax_expiry",
  "permit_expiry",
  "form_49_expiry",
  "attach_date",
  "registration_date",
  "registered_date",
  "notes",
];

export const VEHICLE_INSERT_COLS = `owner_name, owner_phone, driver_name, driver_phone, ownership, make_model, vehicle_type_id, fuel_type,
  seating_capacity, registration_date, registered_date, manufacture_year, attach_date, sub_vendor, sub_vendor_phone,
  contractual_name, contractual_phone, account_holder_name, account_number, account_ifsc, account_bank_name,
  engine_number, chassis_number, ac_type,
  gps_installed, gps_imei, gps_vendor, gps_vendor_id,
  insurance_expiry, fitness_expiry, puc_expiry, tax_expiry, permit_expiry, form_42_47_expiry, form_49_expiry`;

export function vehicleFieldValues(f, typeRes) {
  return [
    f.owner_name,
    f.owner_phone,
    f.driver_name,
    f.driver_phone,
    f.ownership,
    typeRes.make_model,
    typeRes.vehicle_type_id,
    f.fuel_type,
    f.seating_capacity,
    f.registration_date,
    f.registered_date,
    f.manufacture_year,
    f.attach_date,
    f.sub_vendor,
    f.sub_vendor_phone,
    f.contractual_name,
    f.contractual_phone,
    f.account_holder_name,
    f.account_number,
    f.account_ifsc,
    f.account_bank_name,
    f.engine_number,
    f.chassis_number,
    f.ac_type,
    f.gps_installed,
    f.gps_imei,
    f.gps_vendor,
    f.gps_vendor_id,
    f.insurance_expiry,
    f.fitness_expiry,
    f.puc_expiry,
    f.tax_expiry,
    f.permit_expiry,
    f.form_42_47_expiry,
    f.form_49_expiry,
  ];
}

function normalizeOwnershipMode(raw) {
  const v = String(raw || "").trim().toUpperCase();
  if (!v) return null;
  if (v === "OWN") return "OWNER";
  if (v === "DCO" || v === "ATTACHED") return "SUB_VENDOR";
  if (["DRIVER_OWNER", "OWNER", "SUB_VENDOR", "CONTRACTUAL"].includes(v)) return v;
  return v;
}

export function pickVehicleFields(body, existing = {}) {
  const out = {
    owner_name: existing.owner_name ?? null,
    owner_phone: existing.owner_phone ?? null,
    driver_name: existing.driver_name ?? null,
    driver_phone: existing.driver_phone ?? null,
    ownership: existing.ownership ?? null,
    make_model: existing.make_model ?? null,
    fuel_type: existing.fuel_type ?? null,
    seating_capacity: existing.seating_capacity ?? null,
    registration_date: existing.registration_date ?? null,
    registered_date: existing.registered_date ?? null,
    manufacture_year: existing.manufacture_year ?? null,
    attach_date: existing.attach_date ?? null,
    sub_vendor: existing.sub_vendor ?? null,
    sub_vendor_phone: existing.sub_vendor_phone ?? null,
    contractual_name: existing.contractual_name ?? null,
    contractual_phone: existing.contractual_phone ?? null,
    account_holder_name: existing.account_holder_name ?? null,
    account_number: existing.account_number ?? null,
    account_ifsc: existing.account_ifsc ?? null,
    account_bank_name: existing.account_bank_name ?? null,
    engine_number: existing.engine_number ?? null,
    chassis_number: existing.chassis_number ?? null,
    ac_type: existing.ac_type ?? null,
    gps_installed: existing.gps_installed != null ? Number(existing.gps_installed) : 0,
    gps_imei: existing.gps_imei ?? null,
    gps_vendor: existing.gps_vendor ?? null,
    gps_vendor_id: existing.gps_vendor_id ?? null,
    insurance_expiry: existing.insurance_expiry ?? null,
    fitness_expiry: existing.fitness_expiry ?? null,
    puc_expiry: existing.puc_expiry ?? null,
    tax_expiry: existing.tax_expiry ?? null,
    permit_expiry: existing.permit_expiry ?? null,
    // Form 42/47 removed from product UI (same as Permit); keep column nullable for old rows
    form_42_47_expiry: null,
    form_49_expiry: existing.form_49_expiry ?? null,
    notes: existing.notes ?? null,
    is_active: existing.is_active != null ? Number(existing.is_active) : 1,
  };
  for (const k of VEHICLE_STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      out[k] = v === "" || v == null ? null : String(v);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "ownership") || out.ownership) {
    out.ownership = normalizeOwnershipMode(out.ownership);
  }
  if (out.ownership === "DRIVER_OWNER") {
    out.driver_name = out.owner_name;
    out.driver_phone = out.owner_phone;
  }
  if (out.account_ifsc) out.account_ifsc = String(out.account_ifsc).toUpperCase();
  if (Object.prototype.hasOwnProperty.call(body, "manufacture_year")) {
    const y = body.manufacture_year;
    if (y === "" || y == null) out.manufacture_year = null;
    else {
      const n = Number(y);
      out.manufacture_year = Number.isFinite(n) ? n : null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "seating_capacity")) {
    const s = body.seating_capacity;
    if (s === "" || s == null) out.seating_capacity = null;
    else {
      const n = Number(s);
      out.seating_capacity = Number.isFinite(n) && n >= 1 && n <= 55 ? n : null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "gps_installed")) {
    out.gps_installed = body.gps_installed === true || body.gps_installed === 1 || body.gps_installed === "1" ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    out.is_active = body.is_active ? 1 : 0;
  }
  return out;
}
