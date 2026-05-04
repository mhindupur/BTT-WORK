import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminClients() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  async function load() {
    const { data } = await api.get("/clients");
    setRows(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e) {
    e.preventDefault();
    await api.post("/clients", form);
    setForm({ name: "", email: "", phone: "", address: "" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Clients</h1>
      <form onSubmit={create} className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid md:grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Company name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 md:col-span-2"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 md:col-span-2">
          Add client
        </button>
      </form>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
