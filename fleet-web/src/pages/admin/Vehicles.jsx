import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
  buildRegistrationFromParts,
  normalizeVehicleRegistration,
  parseRegistrationToParts,
} from "../../utils/vehicleReg";

const emptyRegParts = () => ({
  state: "KA",
  district: "",
  series: "",
  number: "",
});

export default function AdminVehicles() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({
    client_id: "",
    site_manager_id: "",
    owner_name: "",
    owner_phone: "",
    vehicle_type_id: "",
    fuel_type: "",
    notes: "",
    pasteHint: "",
    ...emptyRegParts(),
  });
  const [formErr, setFormErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [editErr, setEditErr] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [search, setSearch] = useState("");

  async function load() {
    const [v, c, sm, vt] = await Promise.all([
      api.get("/admin/vehicles"),
      api.get("/clients"),
      api.get("/site-managers"),
      api.get("/vehicle-types"),
    ]);
    setRows(v.data);
    setClients(c.data);
    setManagers(sm.data);
    setVehicleTypes(vt.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const managersForClient = useMemo(() => {
    if (!form.client_id) return [];
    return managers.filter((m) => String(m.client_id) === String(form.client_id));
  }, [managers, form.client_id]);

  const managersForEditClient = useMemo(() => {
    if (!editing?.client_id) return [];
    return managers.filter((m) => String(m.client_id) === String(editing.client_id));
  }, [managers, editing?.client_id]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.registration_number,
        r.client_name,
        r.owner_name,
        r.owner_phone,
        r.site_manager_names,
        r.vehicle_type_name,
        r.make_model,
        r.approval_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  function applyPasteToForm(paste, isEdit) {
    const n = normalizeVehicleRegistration(paste);
    if (!n) return false;
    const p = parseRegistrationToParts(n);
    if (p.unparsed) return false;
    const patch = {
      state: p.state,
      district: p.district,
      series: p.series || "",
      number: p.number,
      pasteHint: "",
    };
    if (isEdit) {
      setEditing((e) => ({ ...e, ...patch }));
    } else {
      setForm((f) => ({ ...f, ...patch }));
    }
    return true;
  }

  function resolveRegistration(parts, pasteFallback) {
    let reg = buildRegistrationFromParts(parts.state, parts.district, parts.series, parts.number);
    if (!reg && pasteFallback?.trim()) {
      reg = normalizeVehicleRegistration(pasteFallback);
    }
    return reg;
  }

  async function create(e) {
    e.preventDefault();
    setFormErr("");
    const reg = resolveRegistration(form, form.pasteHint);
    if (!reg) {
      setFormErr(
        "Enter state, district, and vehicle number (series optional), or paste a full number e.g. KA-01-MM-0001 or KA01MM0001."
      );
      return;
    }
    try {
      await api.post("/admin/vehicles", {
        client_id: Number(form.client_id),
        registration_number: reg,
        owner_name: form.owner_name || null,
        owner_phone: form.owner_phone || null,
        vehicle_type_id: form.vehicle_type_id === "" ? null : Number(form.vehicle_type_id),
        fuel_type: form.fuel_type || null,
        notes: form.notes || null,
        site_manager_id: form.site_manager_id === "" ? null : Number(form.site_manager_id),
      });
      setForm({
        client_id: "",
        site_manager_id: "",
        owner_name: "",
        owner_phone: "",
        vehicle_type_id: "",
        fuel_type: "",
        notes: "",
        pasteHint: "",
        ...emptyRegParts(),
      });
      load();
    } catch (ex) {
      setFormErr(ex.response?.data?.error || ex.message);
    }
  }

  function openEdit(row) {
    setEditErr("");
    const p = parseRegistrationToParts(row.registration_number);
    setEditing({
      id: row.id,
      client_id: String(row.client_id),
      site_manager_id: row.site_manager_id != null ? String(row.site_manager_id) : "",
      owner_name: row.owner_name || "",
      owner_phone: row.owner_phone || "",
      vehicle_type_id: row.vehicle_type_id != null ? String(row.vehicle_type_id) : "",
      fuel_type: row.fuel_type || "",
      notes: row.notes || "",
      pasteHint: p.unparsed ? row.registration_number : "",
      state: p.unparsed ? "KA" : p.state,
      district: p.unparsed ? "" : p.district,
      series: p.unparsed ? "" : p.series || "",
      number: p.unparsed ? "" : p.number,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditErr("");
    const reg = resolveRegistration(editing, editing.pasteHint);
    if (!reg) {
      setEditErr(
        "Enter state, district, and vehicle number (series optional), or paste a full number."
      );
      return;
    }
    try {
      await api.patch(`/admin/vehicles/${editing.id}`, {
        client_id: Number(editing.client_id),
        registration_number: reg,
        owner_name: editing.owner_name || null,
        owner_phone: editing.owner_phone || null,
        vehicle_type_id: editing.vehicle_type_id === "" ? null : Number(editing.vehicle_type_id),
        fuel_type: editing.fuel_type || null,
        notes: editing.notes || null,
        site_manager_id: editing.site_manager_id === "" ? null : Number(editing.site_manager_id),
      });
      setEditing(null);
      load();
    } catch (ex) {
      setEditErr(ex.response?.data?.error || ex.message);
    }
  }

  const previewAdd = resolveRegistration(form, form.pasteHint);
  const previewEdit = editing ? resolveRegistration(editing, editing.pasteHint) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Vehicles</h1>

      <form
        onSubmit={create}
        className="bg-white p-4 rounded-xl border border-slate-200 mb-6 space-y-4 shadow-sm"
      >
        <p className="text-sm text-slate-600">
          Vehicle number supports Indian-style plates: <strong>KA-01-MM-0001</strong> or without series{" "}
          <strong>KA-01-0001</strong>. You can type parts below, or paste values like{" "}
          <span className="font-mono">KA 01 MM 0001</span> / <span className="font-mono">KA01MM0001</span>.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          <select
            className="border rounded-lg px-3 py-2"
            value={form.client_id}
            onChange={(e) =>
              setForm({
                ...form,
                client_id: e.target.value,
                site_manager_id: "",
              })
            }
            required
          >
            <option value="">Client *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="border rounded-lg px-3 py-2"
            value={form.site_manager_id}
            onChange={(e) => setForm({ ...form, site_manager_id: e.target.value })}
            disabled={!form.client_id}
          >
            <option value="">Site manager (optional)</option>
            {managersForClient.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} — {m.email}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/80 space-y-3">
          <div className="text-sm font-medium text-slate-700">Vehicle number *</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">State (2 letters)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono uppercase"
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                placeholder="KA"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">District (2 digits)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="01"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Series (optional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono uppercase"
                value={form.series}
                onChange={(e) =>
                  setForm({
                    ...form,
                    series: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3),
                  })
                }
                placeholder="MM"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Number (1–4 digits)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Or paste full number</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              value={form.pasteHint}
              onChange={(e) => setForm({ ...form, pasteHint: e.target.value })}
              onBlur={() => {
                if (form.pasteHint.trim()) applyPasteToForm(form.pasteHint, false);
              }}
              placeholder="KA-01-MM-0001, KA01MM0001, KA-01-0001…"
            />
          </div>
          {previewAdd && (
            <p className="text-sm text-slate-700">
              Stored as: <span className="font-mono font-semibold text-btt-navy">{previewAdd}</span>
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
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
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={form.vehicle_type_id}
            onChange={(e) => setForm({ ...form, vehicle_type_id: e.target.value })}
          >
            <option value="">Vehicle type</option>
            {vehicleTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={form.fuel_type}
            onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
          >
            <option value="">Fuel type</option>
            <option value="DIE">Diesel</option>
            <option value="PET">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="ELE">Electric</option>
          </select>
        </div>
        <input
          className="border rounded-lg px-3 py-2 w-full"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {formErr && <p className="text-red-600 text-sm">{formErr}</p>}
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 px-4 font-medium">
          Add vehicle
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50 space-y-2">
          <div className="text-xs text-slate-600">
            Rows in <span className="font-semibold text-amber-800">amber</span> are waiting for document / vehicle
            review.
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Search registration, client, owner, type, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Reg</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Owner</th>
              <th className="text-left p-3">Site manager</th>
              <th className="text-left p-3 w-28"> </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((v) => {
              const pending = v.approval_status === "pending_review";
              const rejected = v.approval_status === "rejected";
              return (
                <tr
                  key={v.id}
                  className={`border-t border-slate-100 ${
                    pending
                      ? "bg-amber-50 ring-1 ring-inset ring-amber-200"
                      : rejected
                        ? "bg-red-50/60"
                        : ""
                  }`}
                >
                  <td className="p-3 font-mono font-medium">
                    {v.registration_number}
                    {pending ? (
                      <span className="ml-2 inline-block align-middle px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">
                        Review pending
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{v.vehicle_type_name || v.make_model || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        pending
                          ? "bg-amber-200 text-amber-950"
                          : v.approval_status === "approved"
                            ? "bg-green-100 text-green-800"
                            : rejected
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {v.approval_status === "pending_review"
                        ? "Pending review"
                        : v.approval_status || "—"}
                    </span>
                  </td>
                  <td className="p-3">{v.client_name}</td>
                  <td className="p-3">
                    {v.owner_name} {v.owner_phone ? `· ${v.owner_phone}` : ""}
                  </td>
                  <td className="p-3 text-slate-600">{v.site_manager_names || "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1 items-start">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="text-btt-navy font-medium hover:underline"
                      >
                        Edit
                      </button>
                      {pending ? (
                        <a
                          href="/admin/vehicle-approvals"
                          className="text-amber-800 font-semibold hover:underline text-xs"
                        >
                          Open approvals
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredRows.length && (
              <tr>
                <td colSpan={7} className="p-4 text-slate-500">
                  {rows.length ? "No vehicles match your search." : "No vehicles yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start gap-2">
              <h2 className="text-lg font-bold text-btt-navy">Edit vehicle</h2>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setEditing(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={editing.client_id}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    client_id: e.target.value,
                    site_manager_id: "",
                  })
                }
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full border rounded-lg px-3 py-2"
                value={editing.site_manager_id}
                onChange={(e) => setEditing({ ...editing, site_manager_id: e.target.value })}
                disabled={!editing.client_id}
              >
                <option value="">Site manager (optional)</option>
                {managersForEditClient.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} — {m.email}
                  </option>
                ))}
              </select>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="border rounded-lg px-2 py-2 font-mono uppercase text-sm"
                    maxLength={2}
                    value={editing.state}
                    onChange={(e) =>
                      setEditing({ ...editing, state: e.target.value.toUpperCase().slice(0, 2) })
                    }
                    placeholder="KA"
                  />
                  <input
                    className="border rounded-lg px-2 py-2 font-mono text-sm"
                    value={editing.district}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        district: e.target.value.replace(/\D/g, "").slice(0, 2),
                      })
                    }
                    placeholder="01"
                  />
                  <input
                    className="border rounded-lg px-2 py-2 font-mono uppercase text-sm"
                    value={editing.series}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        series: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3),
                      })
                    }
                    placeholder="MM (opt)"
                  />
                  <input
                    className="border rounded-lg px-2 py-2 font-mono text-sm"
                    value={editing.number}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        number: e.target.value.replace(/\D/g, "").slice(0, 4),
                      })
                    }
                    placeholder="0001"
                  />
                </div>
                <input
                  className="w-full border rounded-lg px-2 py-2 font-mono text-sm"
                  value={editing.pasteHint}
                  onChange={(e) => setEditing({ ...editing, pasteHint: e.target.value })}
                  onBlur={() => {
                    if (editing.pasteHint.trim()) applyPasteToForm(editing.pasteHint, true);
                  }}
                  placeholder="Or paste full number"
                />
                {previewEdit && (
                  <p className="text-xs text-slate-600">
                    Stored as: <span className="font-mono font-semibold">{previewEdit}</span>
                  </p>
                )}
              </div>

              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Owner name"
                value={editing.owner_name}
                onChange={(e) => setEditing({ ...editing, owner_name: e.target.value })}
              />
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Owner mobile"
                value={editing.owner_phone}
                onChange={(e) => setEditing({ ...editing, owner_phone: e.target.value })}
              />
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={editing.vehicle_type_id}
                onChange={(e) => setEditing({ ...editing, vehicle_type_id: e.target.value })}
              >
                <option value="">Vehicle type</option>
                {vehicleTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={editing.fuel_type}
                onChange={(e) => setEditing({ ...editing, fuel_type: e.target.value })}
              >
                <option value="">Fuel type</option>
                <option value="DIE">Diesel</option>
                <option value="PET">Petrol</option>
                <option value="CNG">CNG</option>
                <option value="ELE">Electric</option>
              </select>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Notes"
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />

              {editErr && <p className="text-red-600 text-sm">{editErr}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-300"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-btt-navy text-white font-medium">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
