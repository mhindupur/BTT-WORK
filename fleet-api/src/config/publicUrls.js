/**
 * Base URL for owner payment pages: {base}/pay/{token}
 * Used in WhatsApp and must match where fleet-web is reachable (browser + Meta preview).
 *
 * PAYMENT_PUBLIC_BASE_URL — optional; if set, used for payment links only.
 * Otherwise PUBLIC_WEB_ORIGIN (CORS / primary web app URL).
 * Default for local dev: http://localhost:5174
 */
export function getPaymentLinkBase() {
  const raw =
    process.env.PAYMENT_PUBLIC_BASE_URL ||
    process.env.PUBLIC_WEB_ORIGIN ||
    "http://localhost:5174";
  return String(raw).trim().replace(/\/$/, "");
}
