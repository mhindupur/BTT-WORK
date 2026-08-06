/** Friendly labels for vehicle supporting documents (site manager + admin). */
export const VEHICLE_DOC_SECTIONS = [
  {
    type: "RC",
    title: "RC Book",
    short: "Registration Certificate",
    help: "Photo or PDF of the vehicle RC book.",
    needsExpiry: false,
    recommended: true,
  },
  {
    type: "INS",
    title: "Insurance",
    short: "Insurance policy",
    help: "Upload insurance paper and select expiry date.",
    needsExpiry: true,
    vehicleDateField: "insurance_expiry",
    recommended: true,
  },
  {
    type: "FC",
    title: "Fitness (FC)",
    short: "Fitness Certificate",
    help: "Upload FC certificate and select expiry date.",
    needsExpiry: true,
    vehicleDateField: "fitness_expiry",
    recommended: true,
  },
  {
    type: "PUC",
    title: "PUC",
    short: "Pollution certificate",
    help: "Upload PUC certificate and select expiry date.",
    needsExpiry: true,
    vehicleDateField: "puc_expiry",
    recommended: true,
  },
  {
    type: "TAX",
    title: "Road Tax",
    short: "Tax receipt",
    help: "Upload tax receipt and select expiry / valid-till date.",
    needsExpiry: true,
    vehicleDateField: "tax_expiry",
    recommended: true,
  },
  {
    type: "PERMIT",
    title: "Permit",
    short: "Permit 42 / 47",
    help: "Upload permit and select expiry date.",
    needsExpiry: true,
    vehicleDateField: "permit_expiry",
    recommended: false,
  },
  {
    type: "VP",
    title: "Vehicle photo",
    short: "Photo of vehicle",
    help: "Clear photo of the vehicle (number plate visible if possible).",
    needsExpiry: false,
    recommended: false,
  },
  {
    type: "OTHER",
    title: "Other document",
    short: "Any other paper",
    help: "Optional — any extra supporting document.",
    needsExpiry: false,
    recommended: false,
  },
];

export const DOC_STATUS_LABEL = {
  pending: "Waiting for admin",
  approved: "Verified by admin",
  rejected: "Rejected — please re-upload",
};

export const APPROVAL_STATUS_LABEL = {
  draft: "Draft — upload documents",
  pending_review: "Sent to admin — waiting",
  approved: "Approved — ready for work",
  rejected: "Rejected — fix and submit again",
};
