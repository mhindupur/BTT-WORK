/**
 * NUCLICK product branding — keep in sync with BrandMark and theme tokens.
 *
 * Logo source: green triple-swoosh + blue wordmark color theme (provided brand mark).
 * Application name: NUCLICK
 * Caption: The Nucleus of Operational Intelligence
 */
export const BRAND = {
  name: "NUCLICK",
  caption: "The Nucleus of Operational Intelligence",
  shortCaption: "Operational Intelligence",
  productLine: "Fleet & Fuel",
  logoSrc: "/nuclick-logo.jpg",
  /** Colors sampled / matched from the official logo mark */
  colors: {
    blue: "#106EBA",
    blueDark: "#0B4F8C",
    green: "#2AA644",
    greenDark: "#1E8B38",
  },
};

export const APP_DOCUMENT_TITLE = `${BRAND.name} — ${BRAND.caption}`;
