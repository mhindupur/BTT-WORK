import { useEffect, useState } from "react";
import api from "../../api";
import { clientLabel } from "../../utils/vehicleReg";

export default function AdminAccountManagers() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    password: "",
    client_ids: [],
  });
  const [editing, setEditing] = useState(null);
  const [pwdModal, setPwdModal] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const [am, cl] = await Promise.all([api.get("/account-managers"), api.get("/clients")]);
    setRows(am.data);
    setClients(cl.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function toggleIn(list, id) {
    const sid = String(id);
    return list.includes(sid) ? list.filter((x) => x !== sid) : [...list, sid];
  }

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/account-managers", {
        email: form.email,
        full_name: form.full_name,
        phone: form.phone || null,
        password: form.password,
        client_ids: form.client_ids.map(Number),
      });
      setMsg(`Account manager created for ${form.email}. They have view-only access to assigned sites.`);
      setForm({ email: "", full_name: "", phone: "", password: "", client_ids: [] });
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.patch(`/account-managers/${editing.id}`, {
        full_name: editing.full_name,
        phone: editing.phone || null,
        client_ids: editing.client_ids.map(Number),
      });
      setEditing(null);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function submitPassword() {
    try {
      await api.post(`/account-managers/${pwdModal.id}/reset-password`, {
        new_password: pwdModal.password,
      });
      setMsg(`Password updated for ${pwdModal.email}`);
      setPwdModal(null);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  const siteChecklist = (selected, onChangeSelected) => (
    <div className="md:col-span-2 border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1 bg-slate-50">
      <div className="text-xs font-semibold text-slate-600 mb-1">Assigned sites (view access)</div>
      {!clients.length && <p className="text-xs text-slate-500">No sites yet — create a site first.</p>}
      {clients.map((c) => {
        const sid = String(c.id);
        return (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(sid)}
              onChange={() => onChangeSelected(toggleIn(selected, sid))}
            />
            <span>{clientLabel(c)}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-1">Account Managers</h1>
      <p className="text-sm text-slate-600 mb-4">
        BTT assigns sites to an account manager. They can view site and vehicle information only (no edits).
      </p>
      {msg && <p className="mb-3 text-sm text-green-700">{msg}</p>}
      {err && <p className="mb-3 text-sm text-red-700">{err}</p>}

      <form onSubmit={create} className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid md:grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Full name *"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          type="password"
          placeholder="Password * (min 6)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {siteChecklist(form.client_ids, (next) => setForm({ ...form, client_ids: next }))}
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 md:col-span-2">
          Create account manager
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Assigned sites</th>
              <th className="text-left p-3 w-40"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((am) => (
              <tr key={am.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{am.full_name}</td>
                <td className="p-3">{am.email}</td>
                <td className="p-3 text-slate-600">
                  {(am.sites || []).map((s) => s.site_code || s.name).join(", ") || "—"}
                </td>
                <td className="p-3 space-x-2">
                  <button
                    type="button"
                    className="text-btt-navy font-medium hover:underline"
                    onClick={() =>
                      setEditing({
                        id: am.id,
                        full_name: am.full_name,
                        phone: am.phone || "",
                        client_ids: (am.client_ids || []).map(String),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-slate-600 hover:underline"
                    onClick={() =>
                      setPwdModal({ id: am.id, email: am.email, password: "" })
                    }
                  >
                    Password
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  No account managers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-xl border shadow-xl max-w-lg w-full p-6 grid gap-3"
          >
            <h2 className="text-lg font-bold text-btt-navy">Edit account manager</h2>
            <input
              className="border rounded-lg px-3 py-2"
              value={editing.full_name}
              onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
              required
            />
            <input
              className="border rounded-lg px-3 py-2"
              value={editing.phone}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              placeholder="Phone"
            />
            {siteChecklist(editing.client_ids, (next) => setEditing({ ...editing, client_ids: next }))}
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-btt-navy text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {pwdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border shadow-xl max-w-md w-full p-6 space-y-3">
            <h2 className="text-lg font-bold text-btt-navy">Set password</h2>
            <p className="text-sm text-slate-600">{pwdModal.email}</p>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="password"
              placeholder="New password (min 6)"
              value={pwdModal.password}
              onChange={(e) => setPwdModal({ ...pwdModal, password: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setPwdModal(null)}>
                Cancel
              </button>
              <button type="button" className="px-4 py-2 rounded-lg bg-btt-navy text-white" onClick={submitPassword}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
