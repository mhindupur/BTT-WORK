import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminPayments() {
  const [batches, setBatches] = useState([]);
  const [lines, setLines] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [msg, setMsg] = useState("");

  async function loadBatches() {
    const { data } = await api.get("/admin/payments/batches");
    setBatches(data);
  }

  useEffect(() => {
    loadBatches().catch(console.error);
  }, []);

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const { data } = await api.post("/admin/payments/uploads", fd);
      setMsg(`Batch ${data.batch_id}; WhatsApp stub sent: ${data.whatsapp_stub_sent}`);
      loadBatches();
    } catch (ex) {
      setMsg(ex.response?.data?.error || ex.message);
    }
    e.target.value = "";
  }

  async function loadLines(id) {
    setBatchId(id);
    const { data } = await api.get(`/admin/payments/lines?batch_id=${id}`);
    setLines(data);
  }

  const origin = window.location.origin;

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Payments</h1>
      <p className="text-sm text-slate-600 mb-4">
        Upload payment Excel with columns: vehicle/registration, owner, mobile, trips, fuel_advance,
        deductions, total_paid. Owner links: <code className="bg-slate-100 px-1 rounded">/pay/&#123;token&#125;</code>
      </p>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="mb-4" />
      {msg && <p className="text-sm mb-4">{msg}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-2">Batches</h2>
          <ul className="text-sm space-y-2">
            {batches.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="text-btt-accent hover:underline"
                  onClick={() => loadLines(b.id)}
                >
                  #{b.id}
                </button>{" "}
                {b.period_label || b.original_filename} — {b.line_count} lines
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
          <h2 className="font-semibold mb-2">Lines {batchId ? `#${batchId}` : ""}</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th>Vehicle</th>
                <th>Owner</th>
                <th>Total</th>
                <th>Viewed</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1 font-mono">{l.vehicle_registration}</td>
                  <td>{l.owner_name}</td>
                  <td>₹{l.total_paid_rs}</td>
                  <td>{l.owner_viewed_at ? "Yes" : "No"}</td>
                  <td>
                    <a
                      className="text-btt-accent"
                      href={`${origin}/pay/${l.public_token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
