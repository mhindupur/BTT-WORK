import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminSiteManagers() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    client_id: "",
    location_label: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [handover, setHandover] = useState(null); // { from, toId, alsoDelete }
  const [pwdModal, setPwdModal] = useState(null); // { id, name, email, password }

  function digits10(s) {
    return String(s || "").replace(/\D/g, "").slice(0, 10);
  }

  async function load() {
    const [sm, cl] = await Promise.all([api.get("/site-managers"), api.get("/clients")]);
    setRows(sm.data);
    setManagers(sm.data);
    setClients(cl.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.post("/site-managers", {
        ...form,
        phone: digits10(form.phone),
        client_id: Number(form.client_id),
        password: form.password,
      });
      setMsg(`Site manager created. Share the password with ${form.email} out of band.`);
      setForm({ email: "", full_name: "", phone: "", client_id: "", location_label: "", password: "" });
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function submitSetPassword() {
    if (!pwdModal?.id) return;
    setErr("");
    setMsg("");
    try {
      await api.post(`/site-managers/${pwdModal.id}/reset-password`, {
        new_password: pwdModal.password,
      });
      setMsg(`Password updated for ${pwdModal.email}. Share it with the site manager out of band.`);
      setPwdModal(null);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function doDelete(smId) {
    setErr("");
    try {
      await api.delete(`/site-managers/${smId}`);
      load();
    } catch (ex) {
      const d = ex.response?.data;
      if (ex.response?.status === 409 && d?.counts) {
        setErr(
          `${d.error} (indents=${d.counts.indents}, vehicles=${d.counts.vehicles}, serial_pool=${d.counts.serial_pool})`
        );
      } else {
        setErr(d?.error || ex.message);
      }
    }
  }

  async function runHandover() {
    if (!handover?.from || !handover?.toId) return;
    setErr("");
    try {
      await api.post(`/site-managers/${handover.from.id}/handover`, {
        to_site_manager_id: Number(handover.toId),
      });
      if (handover.alsoDelete) {
        await api.delete(`/site-managers/${handover.from.id}`);
      }
      setHandover(null);
      load();
    } catch (ex) {
      const d = ex.response?.data;
      setErr(d?.error || ex.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Site managers</h1>
      <p className="text-sm text-slate-600 mb-4">
        Admin sets the login password directly (temporary). WhatsApp OTP will be re-enabled for production.
      </p>
      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{err}</div>
      )}
      {msg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-900">{msg}</div>
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
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-lg border border-slate-300 bg-slate-50 text-slate-700 text-sm">
            +91
          </span>
          <input
            className="border border-slate-300 rounded-r-lg px-3 py-2 w-full"
            placeholder="10-digit mobile"
            value={digits10(form.phone)}
            onChange={(e) => setForm({ ...form, phone: digits10(e.target.value) })}
            inputMode="numeric"
          />
        </div>
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
          placeholder="Initial password * (min 6)"
          type="text"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Location label"
          value={form.location_label}
          onChange={(e) => setForm({ ...form, location_label: e.target.value })}
        />
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 md:col-span-2">
          Create site manager
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
              <th className="text-left p-3 w-56">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">{r.full_name}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.client_name}</td>
                <td className="p-3">{r.location_label}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-btt-accent font-medium hover:underline"
                      onClick={() =>
                        setPwdModal({ id: r.id, name: r.full_name, email: r.email, password: "" })
                      }
                    >
                      Set password
                    </button>
                    <button
                      type="button"
                      className="text-slate-700 font-medium hover:underline"
                      onClick={() => setHandover({ from: r, toId: "", alsoDelete: true })}
                    >
                      Handover+Delete
                    </button>
                    <button
                      type="button"
                      className="text-red-700 font-medium hover:underline"
                      onClick={() => doDelete(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pwdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-btt-navy">Set password</h2>
              <button
                type="button"
                onClick={() => setPwdModal(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Set a new login password for <strong>{pwdModal.name}</strong> ({pwdModal.email}). Share it with them
              directly — no WhatsApp OTP.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">New password *</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                type="text"
                value={pwdModal.password}
                onChange={(e) => setPwdModal({ ...pwdModal, password: e.target.value })}
                minLength={6}
                placeholder="Min 6 characters"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setPwdModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-btt-navy text-white font-medium disabled:opacity-50"
                disabled={!pwdModal.password || pwdModal.password.length < 6}
                onClick={submitSetPassword}
              >
                Save password
              </button>
            </div>
          </div>
        </div>
      )}

      {handover && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-btt-navy">Handover site manager</h2>
              <button type="button" onClick={() => setHandover(null)} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Transfer <strong>{handover.from.full_name}</strong>’s indents, vehicles, and indent serial pools to another
              site manager of the <strong>same client</strong>, then delete the old account.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Transfer to *</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={handover.toId}
                onChange={(e) => setHandover({ ...handover, toId: e.target.value })}
              >
                <option value="">Select</option>
                {managers
                  .filter((m) => m.client_id === handover.from.client_id && m.id !== handover.from.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={handover.alsoDelete}
                onChange={(e) => setHandover({ ...handover, alsoDelete: e.target.checked })}
              />
              Delete old site manager after handover
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setHandover(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-btt-navy text-white font-medium disabled:opacity-50"
                disabled={!handover.toId}
                onClick={runHandover}
              >
                Run handover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
