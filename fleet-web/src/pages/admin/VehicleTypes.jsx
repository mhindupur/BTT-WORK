import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminVehicleTypes() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await api.get("/vehicle-types", { params: { all: 1 } });
    setRows(data);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/vehicle-types", { name, code: code || null });
      setName("");
      setCode("");
      setMsg("Vehicle type added.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function toggleActive(row) {
    setErr("");
    try {
      await api.patch(`/vehicle-types/${row.id}`, { is_active: !row.is_active });
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function rename(row) {
    const next = window.prompt("Vehicle type name", row.name);
    if (!next || !next.trim() || next.trim() === row.name) return;
    setErr("");
    try {
      await api.patch(`/vehicle-types/${row.id}`, { name: next.trim() });
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function remove(row) {
    if (!window.confirm(`Remove or disable "${row.name}"?`)) return;
    setErr("");
    setMsg("");
    try {
      const { data, status } = await api.delete(`/vehicle-types/${row.id}`);
      if (status === 200 && data?.soft_disabled) {
        setMsg(`"${row.name}" is used by vehicles — disabled instead of deleted.`);
      }
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Vehicle types</h1>
        <p className="text-sm text-slate-600 mt-1">
          These appear in the vehicle type dropdown for Admin and Site Manager. Defaults (Sedan, SUV, TT, Bus, …) are
          loaded automatically.
        </p>
      </div>
      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      <form onSubmit={create} className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-3">
        <input
          className="border rounded-lg px-3 py-2 sm:col-span-2"
          placeholder="New type name * (e.g. Coach)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button type="submit" className="sm:col-span-3 bg-btt-navy text-white rounded-lg py-2.5 font-medium">
          Add vehicle type
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Code</th>
              <th className="p-3">Status</th>
              <th className="p-3 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t ${r.is_active ? "" : "bg-slate-50 text-slate-500"}`}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 font-mono text-xs">{r.code || "—"}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      r.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {r.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="text-btt-navy font-medium hover:underline" onClick={() => rename(r)}>
                      Rename
                    </button>
                    <button type="button" className="text-slate-700 font-medium hover:underline" onClick={() => toggleActive(r)}>
                      {r.is_active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="text-red-700 font-medium hover:underline" onClick={() => remove(r)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  No types yet — defaults will appear after first load.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
