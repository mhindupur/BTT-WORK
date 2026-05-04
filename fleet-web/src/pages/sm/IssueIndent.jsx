import { useEffect, useState } from "react";
import api from "../../api";

export default function IssueIndent() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [history, setHistory] = useState(null);
  const [serial, setSerial] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/sm/vehicles/mine").then((r) => setVehicles(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!vehicleId) {
      setHistory(null);
      return;
    }
    api
      .get(`/sm/vehicles/${vehicleId}/indent-history`)
      .then((r) => setHistory(r.data))
      .catch(() => setHistory(null));
  }, [vehicleId]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const fd = new FormData();
    fd.append("serial_number", serial);
    fd.append("vehicle_id", vehicleId);
    fd.append("amount_rs", amount);
    if (file) fd.append("photo", file);
    try {
      await api.post("/sm/indents", fd);
      setMsg("Indent submitted.");
      setSerial("");
      setAmount("");
      setFile(null);
      if (vehicleId) {
        const r = await api.get(`/sm/vehicles/${vehicleId}/indent-history`);
        setHistory(r.data);
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-btt-navy">Issue advance indent</h1>
      <form onSubmit={submit} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} — {v.client_name}
              </option>
            ))}
          </select>
        </div>
        {history && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="font-semibold text-amber-900 mb-2">
              Vehicle indent history (last 30 days) — safeguard
            </div>
            <p className="text-amber-800 mb-2">
              {history.summary.cnt} indent(s), total ₹{history.summary.total_rs} (all site managers)
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-amber-900">
                  <th>Serial</th>
                  <th>By</th>
                  <th>Date</th>
                  <th>Amt</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.indents.map((i) => (
                  <tr key={i.id} className="border-t border-amber-100">
                    <td className="py-1 font-mono">{i.serial_number}</td>
                    <td>{i.issued_by_name}</td>
                    <td>{new Date(i.created_at).toLocaleDateString()}</td>
                    <td>₹{i.amount_rs}</td>
                    <td>{i.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Serial number *</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 font-mono"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Advance amount (Rs) *</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Indent photo *</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="mt-1"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        <button type="submit" className="bg-btt-accent text-white font-medium py-2.5 px-6 rounded-lg">
          Submit indent
        </button>
      </form>
    </div>
  );
}
