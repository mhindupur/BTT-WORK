import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import PasswordInput from "../../components/PasswordInput";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch } from "../../utils/listFilter";
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
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const [am, cl] = await Promise.all([api.get("/account-managers"), api.get("/clients")]);
    setRows(am.data);
    setClients(cl.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) =>
      matchSearch(r, search, [
        "full_name",
        "email",
        "phone",
        (am) => (am.sites || []).map((s) => s.site_code || s.name).join(" "),
      ])
    );
  }, [rows, search]);

  function exportAccountManagers() {
    downloadExcel({
      filename: `account-managers-${excelStamp()}.xlsx`,
      sheetName: "AccountManagers",
      rows: filteredRows,
      columns: [
        { header: "Name", value: (r) => r.full_name || "" },
        { header: "Email", value: (r) => r.email || "" },
        { header: "Phone", value: (r) => r.phone || "" },
        {
          header: "Assigned sites",
          value: (r) => (r.sites || []).map((s) => s.site_code || s.name).join(", "),
        },
      ],
    });
  }

  function toggleIn(list, id) {
    const sid = String(id);
    return list.includes(sid) ? list.filter((x) => x !== sid) : [...list, sid];
  }

  function openResetPassword(am) {
    setErr("");
    setMsg("");
    setPwdModal({
      id: am.id,
      name: am.full_name,
      email: am.email,
      password: "",
    });
  }

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (String(form.password || "").length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    try {
      await api.post("/account-managers", {
        email: form.email,
        full_name: form.full_name,
        phone: form.phone || null,
        password: form.password,
        client_ids: form.client_ids.map(Number),
      });
      setMsg(
        `Account manager created for ${form.email}. They can sign in with view-only access to the selected sites and the site managers under those sites.`
      );
      setForm({ email: "", full_name: "", phone: "", password: "", client_ids: [] });
      setShowAdd(false);
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
    setErr("");
    if (!pwdModal?.password || pwdModal.password.length < 6) {
      setErr("New password must be at least 6 characters");
      return;
    }
    try {
      await api.post(`/account-managers/${pwdModal.id}/reset-password`, {
        new_password: pwdModal.password,
      });
      setMsg(`Password reset for ${pwdModal.email}. Share the new password with them out of band.`);
      setPwdModal(null);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  const siteChecklist = (selected, onChangeSelected) => (
    <div className="md:col-span-2 border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 bg-slate-50">
      <div className="text-xs font-semibold text-slate-600 mb-1">
        Assign sites (required for access) — site managers at these sites report under this account manager
      </div>
      {!clients.length && <p className="text-xs text-slate-500">No sites yet — create a site first under Sites.</p>}
      {clients.map((c) => {
        const sid = String(c.id);
        return (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(sid)}
              onChange={() => onChangeSelected(toggleIn(selected, sid))}
            />
            <span>
              {clientLabel(c)}
              {c.site_manager_name ? (
                <span className="text-slate-500"> — SM: {c.site_manager_name}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Account Managers</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create the <strong>account_manager</strong> role user and assign one or more sites. They get
            view-only access: all assigned sites, switch into a site, see site managers &amp; vehicles, and
            export Excel reports. Only admin can set or reset their password.
          </p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
            showAdd ? "border border-slate-300 bg-white text-slate-700" : "bg-btt-navy text-white"
          }`}
          onClick={() => {
            setShowAdd((v) => !v);
            setErr("");
            if (showAdd) setForm({ email: "", full_name: "", phone: "", password: "", client_ids: [] });
          }}
          aria-expanded={showAdd}
        >
          {showAdd ? "Hide add form" : "Add account manager"}
        </button>
      </div>
      {msg && <p className="mb-3 text-sm text-green-700">{msg}</p>}
      {err && <p className="mb-3 text-sm text-red-700">{err}</p>}

      {showAdd && (
        <form
          onSubmit={create}
          className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid md:grid-cols-2 gap-3 shadow-sm"
        >
          <div className="md:col-span-2 text-sm font-semibold text-btt-navy">New account manager</div>
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
          <PasswordInput
            placeholder="Password * (min 6)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {siteChecklist(form.client_ids, (next) => setForm({ ...form, client_ids: next }))}
          <div className="md:col-span-2 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300"
              onClick={() => {
                setShowAdd(false);
                setForm({ email: "", full_name: "", phone: "", password: "", client_ids: [] });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 px-4 font-medium">
              Create account manager
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="Account managers"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, email, site…"
          onExport={exportAccountManagers}
          exportDisabled={!filteredRows.length}
        />
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Assigned sites</th>
              <th className="text-left p-3 w-52"> </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((am) => (
              <tr key={am.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{am.full_name}</td>
                <td className="p-3">{am.email}</td>
                <td className="p-3 text-slate-600">
                  {(am.sites || []).map((s) => s.site_code || s.name).join(", ") || "—"}
                </td>
                <td className="p-3 whitespace-nowrap space-x-3">
                  <button
                    type="button"
                    className="text-btt-navy font-medium hover:underline"
                    onClick={() =>
                      setEditing({
                        id: am.id,
                        full_name: am.full_name,
                        phone: am.phone || "",
                        email: am.email,
                        client_ids: (am.client_ids || []).map(String),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-amber-800 font-medium hover:underline"
                    onClick={() => openResetPassword(am)}
                  >
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  {rows.length ? "No account managers match your search." : "No account managers yet."}
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
            <p className="text-xs text-slate-500 -mt-1">{editing.email}</p>
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
            <button
              type="button"
              className="text-left text-sm text-amber-800 font-medium hover:underline"
              onClick={() => {
                openResetPassword({
                  id: editing.id,
                  full_name: editing.full_name,
                  email: editing.email,
                });
                setEditing(null);
              }}
            >
              Reset password…
            </button>
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
            <h2 className="text-lg font-bold text-btt-navy">Reset password</h2>
            <p className="text-sm text-slate-600">
              Set a new login password for <strong>{pwdModal.name}</strong> ({pwdModal.email}). Only
              admin can do this. Share it with them out of band.
            </p>
            <label className="block text-sm font-medium text-slate-700">
              New password *
              <PasswordInput
                className="mt-1"
                placeholder="New password (min 6)"
                value={pwdModal.password}
                onChange={(e) => setPwdModal({ ...pwdModal, password: e.target.value })}
                required
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setPwdModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-btt-navy text-white disabled:opacity-50"
                onClick={submitPassword}
                disabled={!pwdModal.password || pwdModal.password.length < 6}
              >
                Reset password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
