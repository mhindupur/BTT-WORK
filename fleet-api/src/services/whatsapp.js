/**
 * WhatsApp delivery for owner payment links.
 *
 * WHATSAPP_PROVIDER: stub | interakt | meta
 *
 * Interakt (template): set INTERAKT_TEMPLATE_NAME and either INTERAKT_API_KEY or INTERAKT_AUTHORIZATION (full header).
 *   Optional: INTERAKT_API_URL (default https://api.interakt.ai/v1/public/message/),
 *   INTERAKT_TEMPLATE_LANG — must match the approved template language in Meta (e.g. en, en_US),
 *   INTERAKT_AUTH_MODE=basic|bearer (default basic, ignored if INTERAKT_AUTHORIZATION set).
 *
 * Approved template shape (one body variable {{1}} = full payment URL), e.g. name test_invoice_template:
 *   Hello,
 *   Your trip settlement for this period is available online.
 *   Tap the link below to see your payment breakdown:
 *   {{1}}
 *   If you have questions, use the query option on that page.
 *   — BTT Fleet
 *
 * Code sends: template.bodyValues = [ <https://…/pay/{token}> ] → fills {{1}} only.
 *
 * Meta Cloud API (template): set META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_ACCESS_TOKEN,
 *   META_WHATSAPP_TEMPLATE_NAME. Optional META_WHATSAPP_TEMPLATE_LANG (default en).
 *   Same rule: one body parameter = payment URL.
 */

export function normalizeWhatsAppDigits(raw) {
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
    // Interakt docs show "+91" for countryCode.
    return { countryCode: "+91", phoneNumber: e164digits.slice(2) };
  }
  // Fallback for non-India numbers (best-effort)
  return { countryCode: "", phoneNumber: e164digits };
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

async function sendInteraktTemplate(toDigits, templateName, bodyValues, callbackData, buttonValues) {
  const hasAuth = !!(process.env.INTERAKT_API_KEY || process.env.INTERAKT_AUTHORIZATION);
  const endpoint =
    process.env.INTERAKT_API_URL || "https://api.interakt.ai/v1/public/message/";
  if (!hasAuth || !templateName) {
    console.error(
      "[WhatsApp Interakt] Set INTERAKT_TEMPLATE_NAME (or SM template) and INTERAKT_API_KEY or INTERAKT_AUTHORIZATION in .env"
    );
    return { ok: false, error: "interakt_not_configured" };
  }
  const { countryCode, phoneNumber } = splitIndia91(toDigits);
  const lang = (process.env.INTERAKT_TEMPLATE_LANG || "en").trim();
  const vals = Array.isArray(bodyValues) ? bodyValues.map((v) => String(v ?? "").trim()) : [];
  // Interakt docs: buttonValues is an object keyed by buttonIndex:
  // buttonValues: { "0": ["value_for_{{1}}"], "1": ["..."] }
  let btnVals = null;
  if (buttonValues && typeof buttonValues === "object" && !Array.isArray(buttonValues)) {
    btnVals = Object.fromEntries(
      Object.entries(buttonValues).map(([k, arr]) => [
        String(k),
        Array.isArray(arr) ? arr.map((v) => String(v ?? "").trim()) : [],
      ])
    );
  }
  const body = {
    countryCode,
    phoneNumber,
    callbackData: callbackData || "btt",
    type: "Template",
    template: {
      name: String(templateName).trim(),
      languageCode: lang,
      bodyValues: vals,
    },
  };
  // Interakt sometimes expects buttonValues at root (and/or inside template) for templates with buttons.
  if (btnVals && Object.keys(btnVals).length) {
    body.buttonValues = btnVals;
    body.template.buttonValues = btnVals;
  }
  try {
    if (String(process.env.WHATSAPP_DEBUG || "").trim() === "1") {
      console.log("[WhatsApp Interakt] payload", JSON.stringify(body));
    }
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
      console.error("[WhatsApp Interakt] HTTP", res.status, text.slice(0, 800));
      let errLabel = `interakt_http_${res.status}`;
      try {
        const j = JSON.parse(text);
        const msg =
          j.message ||
          j.error?.message ||
          j.error ||
          j.errorMessage ||
          (Array.isArray(j.errors) ? j.errors.map((e) => e.message || e).join("; ") : null);
        if (msg) errLabel += `: ${String(msg).slice(0, 280)}`;
      } catch {
        const oneLine = text.replace(/\s+/g, " ").trim();
        if (oneLine) errLabel += `: ${oneLine.slice(0, 280)}`;
      }
      return { ok: false, error: errLabel };
    }
    return { ok: true, detail: text.slice(0, 200) };
  } catch (e) {
    console.error("[WhatsApp Interakt]", e.message);
    return { ok: false, error: "interakt_network" };
  }
}

async function sendInterakt(toDigits, url, meta) {
  const templateName = (process.env.INTERAKT_TEMPLATE_NAME || "").trim();
  /** Single {{1}} in template = tappable payment link (must be https in production for Meta). */
  const linkText = String(url || "").trim();
  return sendInteraktTemplate(
    toDigits,
    templateName,
    [linkText],
    meta?.vehicle ? `vehicle:${meta.vehicle}` : "payment_link"
  );
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
          components: [
            { type: "body", parameters: [{ type: "text", text: String(url || "").trim() }] },
          ],
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

/** Send Authentication OTP via WhatsApp template ({{1}} = OTP). */
export async function sendAuthOtpWhatsApp(mobile, otp, meta = {}) {
  const provider = (process.env.WHATSAPP_PROVIDER || "stub").toLowerCase();
  const to = normalizeWhatsAppDigits(mobile);
  if (!to) return { ok: false, error: "invalid_mobile" };
  const code = String(otp || "").trim();
  if (!code) return { ok: false, error: "otp_missing" };

  if (provider === "stub") {
    console.log(`[WhatsApp stub] OTP to=${to} otp=${code}`, meta);
    return { ok: true };
  }
  if (provider === "interakt") {
    const tpl = (process.env.INTERAKT_AUTH_OTP_TEMPLATE_NAME || "").trim();
    // Interakt expects buttonValues as an object keyed by button index.
    // "Copy code" button is at index 0 and expects 1 value (OTP).
    return sendInteraktTemplate(to, tpl, [code], meta?.callbackData || "auth_otp", { 0: [code] });
  }
  if (provider === "meta") {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const tpl = (process.env.META_AUTH_OTP_TEMPLATE_NAME || "").trim();
    if (!phoneNumberId || !token || !tpl) return { ok: false, error: "meta_not_configured" };
    const lang = process.env.META_WHATSAPP_TEMPLATE_LANG || "en";
    const ver = process.env.META_GRAPH_API_VERSION || "v21.0";
    try {
      const res = await fetch(`https://graph.facebook.com/${ver}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: tpl,
            language: { code: lang },
            components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json?.error?.message || `meta_http_${res.status}` };
      return { ok: true, detail: json };
    } catch (e) {
      return { ok: false, error: "meta_network" };
    }
  }
  return { ok: false, error: "unknown_provider" };
}
