export const VEHICLE_DOC_TYPES = ["RC", "INS", "FC", "PUC", "TAX", "PERMIT", "VP", "OTHER"];

export function isValidDocType(t) {
  return VEHICLE_DOC_TYPES.includes(String(t || "").toUpperCase());
}
