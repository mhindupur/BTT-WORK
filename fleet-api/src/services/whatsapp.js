/**
 * WhatsApp delivery for owner payment links.
 *
 * WHATSAPP_PROVIDER: stub | interakt | meta
 *
 * Interakt (template): set INTERAKT_API_KEY, INTERAKT_TEMPLATE_NAME.
 *   Optional: INTERAKT_API_URL (default https://api.interakt.ai/v1/public/message/),
 *   INTERAKT_TEMPLATE_LANG (default en), INTERAKT_AUTH_MODE=basic|bearer (default basic).
 *
 * Meta Cloud API (template): set META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_ACCESS_TOKEN,
 *   META_WHATSAPP_TEMPLATE_NAME. Optional META_WHATSAPP_TEMPLATE_LANG (default en).
 *
 * Templates should expose one body variable: the payment URL (or adjust components in Meta dashboard).
 */

function normalizeWhatsAppDigits(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

function splitIndia91(e164digits) {
  if (e164digits.startsWith("91") && e164digits.length >= 12) {
    return { countryCode: "+91", phoneNumber: e164digits.slice(2) };
  }
  return { countryCode: "+", phoneNumber: e164digits };
}

function interaktAuthHeader() {
  const key = process.env.INTERAKT_API_KEY || "";
  const mode = (process.env.INTERAKT_AUTH_MODE || "basic").toLowerCase();
  if (process.env.INTERAKT_AUTHORIZATION) {
    return process.env.INTERAKT_AUTHORIZATION;
  }
  if (mode === "bearer") {
    return `Bearer ${key}`;
  }
  const token = Buffer.from(`${key}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

async function sendInterakt(toDigits, url, meta) {
  const apiKey = process.env.INTERAKT_API_KEY;
  const templateName = process.env.INTERAKT_TEMPLATE_NAME;
  const endpoint =
    process.env.INTERAKT_API_URL || "https://api.interakt.ai/v1/public/message/";
  if (!apiKey || !templateName) {
    console.error("[WhatsApp Interakt] Missing INTERAKT_API_KEY or INTERAKT_TEMPLATE_NAME");
    return { ok: false, error: "interakt_not_configured" };
  }
  const { countryCode, phoneNumber } = splitIndia91(toDigits);
  const lang = process.env.INTERAKT_TEMPLATE_LANG || "en";
  const body = {
    countryCode,
    phoneNumber,
    callbackData: meta?.vehicle ? `vehicle:${meta.vehicle}` : "payment_link",
    type: "Template",
    template: {
      name: templateName,
      languageCode: lang,
      bodyValues: [url],
    },
  };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: interaktAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[WhatsApp Interakt] HTTP", res.status, text.slice(0, 500));
      return { ok: false, error: `interakt_http_${res.status}` };
    }
    return { ok: true, detail: text.slice(0, 200) };
  } catch (e) {
    console.error("[WhatsApp Interakt]", e.message);
    return { ok: false, error: "interakt_network" };
  }
}

async function sendMeta(toDigits, url, _meta) {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const tpl = process.env.META_WHATSAPP_TEMPLATE_NAME;
  if (!phoneNumberId || !token || !tpl) {
    console.error("[WhatsApp Meta] Missing META_WHATSAPP_PHONE_NUMBER_ID, TOKEN, or TEMPLATE_NAME");
    return { ok: false, error: "meta_not_configured" };
  }
  const lang = process.env.META_WHATSAPP_TEMPLATE_LANG || "en";
  const ver = process.env.META_GRAPH_API_VERSION || "v21.0";
  try {
    const res = await fetch(`https://graph.facebook.com/${ver}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toDigits,
        type: "template",
        template: {
          name: tpl,
          language: { code: lang },
          components: [{ type: "body", parameters: [{ type: "text", text: url }] }],
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[WhatsApp Meta] HTTP", res.status, JSON.stringify(json).slice(0, 500));
      return { ok: false, error: json?.error?.message || `meta_http_${res.status}` };
    }
    return { ok: true, detail: json };
  } catch (e) {
    console.error("[WhatsApp Meta]", e.message);
    return { ok: false, error: "meta_network" };
  }
}

/**
 * @param {string} mobile raw mobile from Excel
 * @param {string} url public payment URL
 * @param {{ vehicle?: string }} meta
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendPaymentLinkWhatsApp(mobile, url, meta = {}) {
  const provider = (process.env.WHATSAPP_PROVIDER || "stub").toLowerCase();
  const to = normalizeWhatsAppDigits(mobile);
  if (!to) {
    console.warn("[WhatsApp] invalid mobile:", mobile);
    return { ok: false, error: "invalid_mobile" };
  }

  if (provider === "stub") {
    console.log(`[WhatsApp stub] to=${to} url=${url}`, meta);
    return { ok: true };
  }
  if (provider === "interakt") {
    return sendInterakt(to, url, meta);
  }
  if (provider === "meta") {
    return sendMeta(to, url, meta);
  }
  console.warn("[WhatsApp] unknown WHATSAPP_PROVIDER:", provider);
  return { ok: false, error: "unknown_provider" };
}

/** @deprecated use sendPaymentLinkWhatsApp */
export function logPaymentLink(mobile, url, meta = {}) {
  sendPaymentLinkWhatsApp(mobile, url, meta).catch(() => {});
}
