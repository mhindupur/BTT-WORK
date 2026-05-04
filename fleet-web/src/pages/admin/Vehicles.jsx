import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminVehicles() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({
    client_id: "",
    registration_number: "",
    owner_name: "",
    owner_phone: "",
    site_manager_ids: [],
  });

  async function load() {
    const [v, c, sm] = await Promise.all([
      api.get("/admin/vehicles"),
      api.get("/clients"),
      api.get("/site-managers"),
    ]);
    setRows(v.data);
    setClients(c.data);
    setManagers(sm.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function toggleSm(id) {
    const sid = Number(id);
    setForm((f) => ({
      ...f,
      site_manager_ids: f.site_manager_ids.includes(sid)
        ? f.site_manager_ids.filter((x) => x !== sid)
        : [...f.site_manager_ids, sid],
    }));
  }

  async function create(e) {
    e.preventDefault();
    await api.post("/admin/vehicles", {
      ...form,
      client_id: Number(form.client_id),
      site_manager_ids: form.site_manager_ids,
    });
    setForm({
      client_id: "",
      registration_number: "",
      owner_name: "",
      owner_phone: "",
      site_manager_ids: [],
    });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Vehicles</h1>
      <form
        onSubmit={create}
        className="bg-white p-4 rounded-xl border border-slate-200 mb-6 space-y-3"
      >
        <div className="grid md:grid-cols-2 gap-3">
          <select
            className="border rounded-lg px-3 py-2"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            required
          >
            <option value="">Client *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Registration *"
            value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Owner name"
            value={form.owner_name}
            onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Owner mobile"
            value={form.owner_phone}
            onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
          />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">Assign site managers</div>
          <div className="flex flex-wrap gap-2">
            {managers.map((m) => (
              <label key={m.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.site_manager_ids.includes(m.id)}
                  onChange={() => toggleSm(m.id)}
                />
                {m.full_name}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 px-4">
          Add vehicle
        </button>
      </form>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Reg</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Owner</th>
              <th className="text-left p-3">Site managers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="p-3 font-mono font-medium">{v.registration_number}</td>
                <td className="p-3">{v.client_name}</td>
                <td className="p-3">
                  {v.owner_name} {v.owner_phone ? `· ${v.owner_phone}` : ""}
                </td>
                <td className="p-3 text-slate-600">{v.site_manager_names || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
