export const VEHICLE_DOC_TYPES = ["RC", "INS", "FC", "PUC", "TAX", "PERMIT", "VP", "OTHER"];

/** Map document type → vehicles.* expiry column (when SM sets expiry on upload). */
export const DOC_TYPE_VEHICLE_DATE = {
  INS: "insurance_expiry",
  FC: "fitness_expiry",
  PUC: "puc_expiry",
  TAX: "tax_expiry",
  PERMIT: "permit_expiry",
};

export function isValidDocType(t) {
  return VEHICLE_DOC_TYPES.includes(String(t || "").toUpperCase());
}
