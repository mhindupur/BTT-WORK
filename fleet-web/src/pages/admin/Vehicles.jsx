import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import VehicleInfoFields from "../../components/VehicleInfoFields";
import {
  detailsFromVehicleRow,
  detailsPayload,
  emptyVehicleDetails,
  ownershipLabel,
} from "../../constants/vehicleFields";
import { clientLabel, formatRegInput, isSlaExceeded, normalizeVehicleRegistration } from "../../utils/vehicleReg";

const emptyForm = () => ({
  client_id: "",
  site_manager_id: "",
  vehicle_type_id: "",
  registration_number: "",
  is_active: true,
  ...emptyVehicleDetails(),
});

export default function AdminVehicles() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState(emptyForm);
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
        r.vehicle_serial,
        r.client_name,
        r.site_code,
        r.owner_name,
        r.owner_phone,
        r.ownership,
        r.engine_number,
        r.chassis_number,
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

  async function create(e) {
    e.preventDefault();
    setFormErr("");
    const reg = normalizeVehicleRegistration(form.registration_number);
    if (!reg) {
      setFormErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
      return;
    }
    try {
      await api.post("/admin/vehicles", {
        client_id: Number(form.client_id),
        registration_number: reg,
        vehicle_type_id: form.vehicle_type_id === "" ? null : Number(form.vehicle_type_id),
        site_manager_id: form.site_manager_id === "" ? null : Number(form.site_manager_id),
        is_active: form.is_active !== false,
        ...detailsPayload(form),
      });
      setForm(emptyForm());
      load();
    } catch (ex) {
      setFormErr(ex.response?.data?.error || ex.message);
    }
  }

  function openEdit(row) {
    setEditErr("");
    setEditing({
      id: row.id,
      client_id: String(row.client_id),
      site_manager_id: row.site_manager_id != null ? String(row.site_manager_id) : "",
      vehicle_type_id: row.vehicle_type_id != null ? String(row.vehicle_type_id) : "",
      registration_number: formatRegInput(row.registration_number),
      vehicle_serial: row.vehicle_serial || "",
      is_active: row.is_active !== 0 && row.is_active !== false,
      ...detailsFromVehicleRow(row),
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditErr("");
    const reg = normalizeVehicleRegistration(editing.registration_number);
    if (!reg) {
      setEditErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
      return;
    }
    try {
      await api.patch(`/admin/vehicles/${editing.id}`, {
        client_id: Number(editing.client_id),
        registration_number: reg,
        vehicle_type_id: editing.vehicle_type_id === "" ? null : Number(editing.vehicle_type_id),
        site_manager_id: editing.site_manager_id === "" ? null : Number(editing.site_manager_id),
        is_active: editing.is_active !== false,
        ...detailsPayload(editing),
      });
      setEditing(null);
      load();
    } catch (ex) {
      setEditErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Vehicles</h1>

      <form
        onSubmit={create}
        className="bg-white p-4 rounded-xl border border-slate-200 mb-6 space-y-4 shadow-sm"
      >
        <p className="text-sm text-slate-600">
          Vehicle number is stored in CAPS with no hyphen, e.g. <span className="font-mono font-semibold">KA01MM1234</span>.
          Each vehicle number is unique. Site serial (e.g. INFNG0001) is assigned automatically.
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
            <option value="">Client / site *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientLabel(c)}
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

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Vehicle number (Reg No) *</span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 font-mono uppercase"
            placeholder="KA01MM1234"
            value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: formatRegInput(e.target.value) })}
            required
          />
        </label>

        <VehicleInfoFields value={form} onChange={setForm} vehicleTypes={vehicleTypes} />

        {formErr && <p className="text-red-600 text-sm">{formErr}</p>}
        <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 px-4 font-medium">
          Add vehicle
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50 space-y-2">
          <div className="text-xs text-slate-600">
            Rows in <span className="font-semibold text-amber-800">amber</span> await review. Rows in{" "}
            <span className="font-semibold text-orange-800">orange</span> exceed the site SLA age — remove them
            manually if needed.
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Search registration, serial, owner, chassis, type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Reg</th>
              <th className="text-left p-3">Serial</th>
              <th className="text-left p-3">Type / year</th>
              <th className="text-left p-3">Ownership</th>
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
              const slaOver = isSlaExceeded(v);
              return (
                <tr
                  key={v.id}
                  className={`border-t border-slate-100 ${
                    slaOver
                      ? "bg-orange-100 ring-1 ring-inset ring-orange-300"
                      : pending
                        ? "bg-amber-50 ring-1 ring-inset ring-amber-200"
                        : rejected
                          ? "bg-red-50/60"
                          : ""
                  }`}
                >
                  <td className="p-3 font-mono font-medium">
                    {v.registration_number}
                    {slaOver ? (
                      <span className="ml-2 inline-block align-middle px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-600 text-white">
                        Over SLA age
                      </span>
                    ) : null}
                    {pending ? (
                      <span className="ml-2 inline-block align-middle px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">
                        Review pending
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 font-mono text-xs">{v.vehicle_serial || "—"}</td>
                  <td className="p-3">
                    {v.vehicle_type_name || v.make_model || "—"}
                    {v.manufacture_year ? ` · ${v.manufacture_year}` : ""}
                    {v.seating_capacity ? ` · ${v.seating_capacity}s` : ""}
                  </td>
                  <td className="p-3">{ownershipLabel(v.ownership)}</td>
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
                  <td className="p-3">
                    {v.client_name}
                    {v.site_code ? ` (${v.site_code})` : ""}
                  </td>
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
                <td colSpan={9} className="p-4 text-slate-500">
                  {rows.length ? "No vehicles match your search." : "No vehicles yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
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
                    {clientLabel(c)}
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

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Vehicle number *</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 font-mono uppercase"
                  value={editing.registration_number}
                  onChange={(e) =>
                    setEditing({ ...editing, registration_number: formatRegInput(e.target.value) })
                  }
                />
              </label>
              {editing.vehicle_serial ? (
                <p className="text-sm text-slate-600">
                  Serial: <span className="font-mono font-semibold">{editing.vehicle_serial}</span>
                </p>
              ) : null}

              <VehicleInfoFields value={editing} onChange={setEditing} vehicleTypes={vehicleTypes} dense />

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
