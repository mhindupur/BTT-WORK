import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

/**
 * Proxy IFSC lookup so the API key stays server-side.
 * GET /api/ifsc/:code
 * Upstream: https://ifsc.indianapi.in/ifsc?bank_code=XXXX
 */
r.get("/:code", requireAuth, async (req, res) => {
  const code = String(req.params.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid IFSC code" });
  }

  const key = process.env.INDIANAPI_IFSC_KEY || process.env.IFSC_API_KEY || "";
  const base = (process.env.INDIANAPI_IFSC_URL || "https://ifsc.indianapi.in/ifsc").replace(/\/$/, "");

  if (!key) {
    return res.status(503).json({
      error:
        "IFSC API key not configured. Add INDIANAPI_IFSC_KEY to fleet-api/.env and restart with: pm2 restart btt-fleet-api --update-env",
    });
  }

  try {
    const headers = { Accept: "application/json", "x-api-key": key };

    // IndianAPI expects ?bank_code=IFSC (not path segment)
    const url = `${base}?bank_code=${encodeURIComponent(code)}`;
    const upstream = await fetch(url, { headers });
    const text = await upstream.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!upstream.ok) {
      const msg = data?.message || data?.error || data?.raw || "IFSC lookup failed";
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: String(msg).includes("API key")
          ? "IFSC API key rejected. Check INDIANAPI_IFSC_KEY in fleet-api/.env, then: pm2 restart btt-fleet-api --update-env"
          : msg,
        detail: data,
      });
    }
    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message || "IFSC lookup failed" });
  }
});

export default r;
