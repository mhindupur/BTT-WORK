import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminFuel() {
  const [uploads, setUploads] = useState([]);
  const [lines, setLines] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");

  async function loadUploads() {
    const { data } = await api.get("/admin/fuel/uploads");
    setUploads(data);
  }

  useEffect(() => {
    loadUploads().catch(console.error);
  }, []);

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const { data } = await api.post("/admin/fuel/uploads", fd);
      setMsg(`Upload #${data.upload_id}: ${data.alerts_count} alert(s).`);
      loadUploads();
    } catch (ex) {
      setMsg(ex.response?.data?.error || ex.message);
    }
    e.target.value = "";
  }

  async function viewLines(id) {
    setSelected(id);
    const { data } = await api.get(`/admin/fuel/uploads/${id}/lines`);
    setLines(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Fuel reconciliation</h1>
      <p className="text-sm text-slate-600 mb-4">
        Upload fuel pump Excel (.xlsx). Include columns: vehicle / registration, amount / filled_amount;
        optional serial_number to match indents. Mismatches appear on the dashboard.
      </p>
      <input type="file" accept=".xlsx,.xls" onChange={onFile} className="mb-4" />
      {msg && <p className="text-sm mb-4 text-btt-accent">{msg}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-2">Uploads</h2>
          <ul className="text-sm space-y-2">
            {uploads.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="text-btt-accent hover:underline"
                  onClick={() => viewLines(u.id)}
                >
                  #{u.id}
                </button>{" "}
                {u.original_filename}{" "}
                <span className="text-slate-500">{new Date(u.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
          <h2 className="font-semibold mb-2">Lines {selected ? `#${selected}` : ""}</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pr-2 py-1">Indent #</th>
                <th className="pr-2 py-1">Reg</th>
                <th className="pr-2 py-1">Filled</th>
                <th className="pr-2 py-1">Variance</th>
                <th className="py-1">Alert</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1 pr-2 font-mono font-semibold text-btt-navy whitespace-nowrap">
                    {l.indent_number || l.indent_serial || l.matched_serial || "—"}
                  </td>
                  <td className="py-1 pr-2 font-mono whitespace-nowrap">{l.vehicle_registration}</td>
                  <td className="py-1 pr-2">{l.filled_amount_rs}</td>
                  <td className="py-1 pr-2">{l.variance_rs != null ? l.variance_rs : "—"}</td>
                  <td className="py-1 text-amber-700">{l.alert_message || "—"}</td>
                </tr>
              ))}
              {!lines.length && selected ? (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-500">
                    No lines for this upload.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
