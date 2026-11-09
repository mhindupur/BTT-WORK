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

  try {
    const headers = { Accept: "application/json" };
    if (key) headers["x-api-key"] = key;

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
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: data?.message || data?.error || "IFSC lookup failed",
        detail: data,
      });
    }
    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message || "IFSC lookup failed" });
  }
});

export default r;
