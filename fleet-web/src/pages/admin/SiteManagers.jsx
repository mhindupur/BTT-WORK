import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminSiteManagers() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    client_id: "",
    location_label: "",
  });
  const [tempPw, setTempPw] = useState("");

  async function load() {
    const [sm, cl] = await Promise.all([api.get("/site-managers"), api.get("/clients")]);
    setRows(sm.data);
    setClients(cl.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e) {
    e.preventDefault();
    setTempPw("");
    const { data } = await api.post("/site-managers", {
      ...form,
      client_id: Number(form.client_id),
    });
    if (data.temporary_password) setTempPw(data.temporary_password);
    setForm({ email: "", full_name: "", phone: "", client_id: "", location_label: "" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Site managers</h1>
      {tempPw && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          Temporary password (copy now): <code className="font-mono font-bold">{tempPw}</code>
        </div>
      )}
      <form
        onSubmit={create}
        className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid md:grid-cols-2 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Email *"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Full name *"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
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
          className="border rounded-lg px-3 py-2 md:col-span-2"
          placeholder="Location label"
          value={form.location_label}
          onChange={(e) => setForm({ ...form, location_label: e.target.value })}
        />
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 md:col-span-2">
          Create (auto-generated password)
        </button>
      </form>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">{r.full_name}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.client_name}</td>
                <td className="p-3">{r.location_label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
