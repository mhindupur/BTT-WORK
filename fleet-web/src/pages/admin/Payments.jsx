import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminPayments() {
  const [batches, setBatches] = useState([]);
  const [lines, setLines] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [waConfig, setWaConfig] = useState(null);
  const [showWaHelp, setShowWaHelp] = useState(false);

  async function loadBatches() {
    const { data } = await api.get("/admin/payments/batches");
    setBatches(data);
  }

  useEffect(() => {
    loadBatches().catch(console.error);
    api
      .get("/admin/payments/whatsapp-config")
      .then((r) => setWaConfig(r.data))
      .catch(() => setWaConfig(null));
  }, []);

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("");
    setErr("");
    const fd = new FormData();
    fd.append("file", f);
    if (periodLabel.trim()) fd.append("period_label", periodLabel.trim());
    try {
      const { data } = await api.post("/admin/payments/uploads", fd);
      const parts = [
        `Batch ${data.batch_id}`,
        `WhatsApp provider: ${data.whatsapp_provider || "stub"}`,
        `Sent: ${data.whatsapp_sent ?? data.whatsapp_stub_sent ?? 0}`,
      ];
      if (data.whatsapp_failed > 0) {
        parts.push(`Failed: ${data.whatsapp_failed}`);
      }
      setMsg(parts.join(". ") + ".");
      if (data.whatsapp_errors?.length) {
        setErr(
          data.whatsapp_errors.map((x) => `${x.mobile}: ${x.error}`).join(" · ")
        );
      } else {
        setErr("");
      }
      loadBatches();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
    e.target.value = "";
  }

  async function loadLines(id) {
    setBatchId(id);
    const { data } = await api.get(`/admin/payments/lines?batch_id=${id}`);
    setLines(data);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-btt-navy">Payments</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Upload an Excel workbook with owner settlement lines. Each row with a{" "}
          <strong>mobile number</strong> triggers a WhatsApp send (per{" "}
          <code className="bg-slate-100 px-1 rounded text-xs">WHATSAPP_PROVIDER</code> in{" "}
          <code className="bg-slate-100 px-1 rounded text-xs">fleet-api/.env</code>
          ): <strong>stub</strong> (console only), <strong>interakt</strong>, or <strong>meta</strong> (Meta Cloud
          API). Public link format:{" "}
          <code className="bg-slate-100 px-1 rounded text-xs">/pay/&#123;token&#125;</code>
        </p>
      </div>

      {waConfig && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-btt-navy">WhatsApp integration</span>
              <span className="text-slate-600">
                {" "}
                — active provider: <strong className="text-slate-800">{waConfig.provider}</strong>
              </span>
            </div>
            <button
              type="button"
              className="text-btt-accent text-sm font-medium hover:underline"
              onClick={() => setShowWaHelp((v) => !v)}
            >
              {showWaHelp ? "Hide setup notes" : "Interakt / Meta setup"}
            </button>
          </div>
          {waConfig.provider === "interakt" && (
            <p className="mt-2 text-slate-600">
              Interakt template configured:{" "}
              <strong>{waConfig.interakt.configured ? "yes" : "no — set INTERAKT_API_KEY and INTERAKT_TEMPLATE_NAME"}</strong>
              {waConfig.interakt.template ? ` (${waConfig.interakt.template})` : ""}
            </p>
          )}
          {waConfig.provider === "meta" && (
            <p className="mt-2 text-slate-600">
              Meta template configured:{" "}
              <strong>{waConfig.meta.configured ? "yes" : "no — set META_* vars in .env"}</strong>
              {waConfig.meta.template ? ` (${waConfig.meta.template})` : ""}
            </p>
          )}
          {showWaHelp && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 space-y-2 text-xs sm:text-sm">
              <p>
                <strong>Interakt:</strong> Create an approved WhatsApp template with{" "}
                <strong>one body variable</strong> (the payment URL). Set{" "}
                <code className="bg-white px-1 rounded">WHATSAPP_PROVIDER=interakt</code>,{" "}
                <code className="bg-white px-1 rounded">INTERAKT_API_KEY</code>,{" "}
                <code className="bg-white px-1 rounded">INTERAKT_TEMPLATE_NAME</code>. Use{" "}
                <code className="bg-white px-1 rounded">INTERAKT_AUTH_MODE=bearer</code> if your project uses Bearer
                instead of Basic.
              </p>
              <p>
                <strong>Meta Cloud API:</strong> Set{" "}
                <code className="bg-white px-1 rounded">WHATSAPP_PROVIDER=meta</code>,{" "}
                <code className="bg-white px-1 rounded">META_WHATSAPP_PHONE_NUMBER_ID</code>,{" "}
                <code className="bg-white px-1 rounded">META_WHATSAPP_ACCESS_TOKEN</code>, and a template name matching
                your Meta app (one body parameter = URL).
              </p>
              <p>
                <strong>Public URL in messages:</strong>{" "}
                <code className="bg-white px-1 rounded">{waConfig.public_web_origin}</code> — set{" "}
                <code className="bg-white px-1 rounded">PUBLIC_WEB_ORIGIN</code> to your live web origin in production.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">Period label (optional)</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. March 2026 — Trip settlement"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>
          <a
            href="/samples/payments-sample.xlsx"
            download
            className="inline-flex items-center justify-center rounded-lg border-2 border-btt-accent/40 bg-btt-accent/5 text-btt-navy font-medium px-4 py-2.5 text-sm hover:bg-btt-accent/10 min-h-[44px]"
          >
            Download sample Excel
          </a>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Upload workbook (.xlsx / .xls)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-btt-navy file:text-white file:text-sm"
          />
        </div>

        <div className="text-xs text-slate-600 border-t border-slate-100 pt-3 space-y-1">
          <p className="font-medium text-slate-700">Expected columns (header row)</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>Vehicle</strong> — one of: Vehicle Registration, Registration, Reg No, Vehicle Number
            </li>
            <li>
              <strong>Owner</strong> — Owner Name, Owner, Name, Driver Name
            </li>
            <li>
              <strong>Mobile</strong> — Mobile, Phone, Contact, WhatsApp (10 digits, or 91…); used for WhatsApp
            </li>
            <li>
              <strong>Trip Count</strong> — Trip Count, Trips (optional)
            </li>
            <li>
              <strong>Fuel Advance Rs</strong> — Fuel Advance, Fuel Advance Rs (optional)
            </li>
            <li>
              <strong>Other Deductions Rs</strong> — Other Deductions, Deductions, EMI (optional)
            </li>
            <li>
              <strong>Total Paid Rs</strong> — Total Paid, Total, Net, Payable
            </li>
          </ul>
        </div>

        {msg && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</p>}
        {err && <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-semibold text-btt-navy mb-3">Batches</h2>
          <ul className="text-sm space-y-2">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <button
                  type="button"
                  className="text-btt-accent font-medium hover:underline"
                  onClick={() => loadLines(b.id)}
                >
                  #{b.id}
                </button>
                <span className="text-slate-600">
                  {b.period_label || b.original_filename} — {b.line_count} lines
                </span>
              </li>
            ))}
            {batches.length === 0 && <li className="text-slate-500">No batches yet.</li>}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-hidden">
          <h2 className="font-semibold text-btt-navy mb-3">Lines {batchId ? `#${batchId}` : ""}</h2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[420px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 pr-2">Vehicle</th>
                  <th className="pb-2 pr-2">Owner</th>
                  <th className="pb-2 pr-2">Mobile</th>
                  <th className="pb-2 pr-2">Total</th>
                  <th className="pb-2 pr-2">WA sent</th>
                  <th className="pb-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-2 pr-2 font-mono whitespace-nowrap">{l.vehicle_registration}</td>
                    <td className="py-2 pr-2 max-w-[7rem] truncate">{l.owner_name}</td>
                    <td className="py-2 pr-2 font-mono text-[11px] whitespace-nowrap">{l.owner_mobile || "—"}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">₹{l.total_paid_rs}</td>
                    <td className="py-2 pr-2">{l.whatsapp_sent_at ? "Yes" : "—"}</td>
                    <td className="py-2">
                      <a
                        className="text-btt-accent font-medium hover:underline whitespace-nowrap"
                        href={`${origin}/pay/${l.public_token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!batchId && <p className="text-sm text-slate-500 mt-2">Select a batch to view lines.</p>}
        </div>
      </div>
    </div>
  );
}
