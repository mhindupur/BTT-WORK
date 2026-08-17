/** Vehicle detail options and empty form defaults. */

export const OWNERSHIP_OPTIONS = [
  { value: "OWN", label: "Own" },
  { value: "DCO", label: "DCO" },
  { value: "ATTACHED", label: "Attached" },
];

export const FUEL_TYPE_OPTIONS = [
  { value: "DIE", label: "Diesel" },
  { value: "PET", label: "Petrol" },
  { value: "CNG", label: "CNG" },
  { value: "ELE", label: "Electric" },
  { value: "HYB", label: "Hybrid (Petrol-Electric)" },
];

export const AC_TYPE_OPTIONS = [
  { value: "AC", label: "AC" },
  { value: "NON_AC", label: "Non-AC" },
];

export const GPS_OPTIONS = [
  { value: "0", label: "No" },
  { value: "1", label: "Yes" },
];

export const SEATING_CAPACITY_MAX = 55;

export const SEATING_OPTIONS = Array.from({ length: SEATING_CAPACITY_MAX }, (_, i) => i + 1);

export const VENDOR_TYPE_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "MULTIPLE", label: "Multiple" },
];

/** Extra vehicle info fields (beyond registration / client / type). */
export const emptyVehicleDetails = () => ({
  ownership: "",
  owner_name: "",
  owner_phone: "",
  fuel_type: "",
  seating_capacity: "",
  registration_date: "",
  manufacture_year: "",
  attach_date: "",
  sub_vendor: "",
  engine_number: "",
  chassis_number: "",
  ac_type: "",
  gps_installed: "0",
  gps_imei: "",
  gps_vendor: "",
  insurance_expiry: "",
  fitness_expiry: "",
  puc_expiry: "",
  tax_expiry: "",
  permit_expiry: "",
  form_42_47_expiry: "",
  form_49_expiry: "",
  notes: "",
});

export function detailsFromVehicleRow(row = {}) {
  const d = emptyVehicleDetails();
  for (const k of Object.keys(d)) {
    if (k === "gps_installed") {
      d.gps_installed = row.gps_installed ? "1" : "0";
      continue;
    }
    if (k.endsWith("_expiry") || k === "attach_date" || k === "registration_date") {
      d[k] = row[k] ? String(row[k]).slice(0, 10) : "";
      continue;
    }
    if (k === "manufacture_year" || k === "seating_capacity") {
      d[k] = row[k] != null && row[k] !== "" ? String(row[k]) : "";
      continue;
    }
    d[k] = row[k] != null ? String(row[k]) : "";
  }
  return d;
}

/** Payload fields for create/update API (null for empty strings). */
export function detailsPayload(form) {
  const nullIfEmpty = (v) => (v === "" || v == null ? null : v);
  return {
    ownership: nullIfEmpty(form.ownership),
    owner_name: nullIfEmpty(form.owner_name),
    owner_phone: nullIfEmpty(form.owner_phone),
    fuel_type: nullIfEmpty(form.fuel_type),
    seating_capacity:
      form.seating_capacity === "" || form.seating_capacity == null
        ? null
        : Number(form.seating_capacity),
    registration_date: nullIfEmpty(form.registration_date),
    manufacture_year:
      form.manufacture_year === "" || form.manufacture_year == null
        ? null
        : Number(form.manufacture_year),
    attach_date: nullIfEmpty(form.attach_date),
    sub_vendor: nullIfEmpty(form.sub_vendor),
    engine_number: nullIfEmpty(form.engine_number),
    chassis_number: nullIfEmpty(form.chassis_number),
    ac_type: nullIfEmpty(form.ac_type),
    gps_installed: form.gps_installed === "1" || form.gps_installed === true || form.gps_installed === 1,
    gps_imei: nullIfEmpty(form.gps_imei),
    gps_vendor: nullIfEmpty(form.gps_vendor),
    insurance_expiry: nullIfEmpty(form.insurance_expiry),
    fitness_expiry: nullIfEmpty(form.fitness_expiry),
    puc_expiry: nullIfEmpty(form.puc_expiry),
    tax_expiry: nullIfEmpty(form.tax_expiry),
    permit_expiry: nullIfEmpty(form.permit_expiry),
    form_42_47_expiry: nullIfEmpty(form.form_42_47_expiry),
    form_49_expiry: nullIfEmpty(form.form_49_expiry),
    notes: nullIfEmpty(form.notes),
  };
}

export function fuelLabel(code) {
  return FUEL_TYPE_OPTIONS.find((o) => o.value === code)?.label || code || "—";
}

export function ownershipLabel(code) {
  return OWNERSHIP_OPTIONS.find((o) => o.value === code)?.label || code || "—";
}
