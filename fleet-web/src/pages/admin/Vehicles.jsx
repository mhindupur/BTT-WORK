import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import VehicleInfoFields from "../../components/VehicleInfoFields";
import { APPROVAL_STATUS_LABEL } from "../../constants/vehicleDocs";
import {
  detailsFromVehicleRow,
  detailsPayload,
  emptyVehicleDetails,
  ownershipLabel,
} from "../../constants/vehicleFields";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";
import { clientLabel, formatRegInput, isSlaExceeded, normalizeVehicleRegistration } from "../../utils/vehicleReg";

const emptyForm = () => ({
  client_id: "",
  site_manager_id: "",
  vehicle_type_id: "",
  registration_number: "",
  is_active: true,
  ...emptyVehicleDetails(),
});

function smForSite(clients, clientId) {
  const c = clients.find((x) => String(x.id) === String(clientId));
  if (!c?.site_manager_id) return { id: "", label: "No site manager linked to this site" };
  const name = c.site_manager_name || "Site manager";
  const email = c.site_manager_email ? ` — ${c.site_manager_email}` : "";
  return { id: String(c.site_manager_id), label: `${name}${email}` };
}

export default function AdminVehicles() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [editErr, setEditErr] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  async function load() {
    const [v, c, vt] = await Promise.all([
      api.get("/admin/vehicles"),
      api.get("/clients"),
      api.get("/vehicle-types"),
    ]);
    setRows(v.data);
    setClients(c.data);
    setVehicleTypes(vt.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const formSm = useMemo(() => smForSite(clients, form.client_id), [clients, form.client_id]);
  const editSm = useMemo(
    () => smForSite(clients, editing?.client_id),
    [clients, editing?.client_id]
  );

  const siteOptions = useMemo(
    () =>
      uniqueOptions(rows, (r) => (r.site_code ? `${r.client_name} (${r.site_code})` : r.client_name), {
        emptyLabel: "All sites",
      }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.approval_status !== statusFilter) return false;
      if (siteFilter) {
        const label = r.site_code ? `${r.client_name} (${r.site_code})` : r.client_name;
        if (label !== siteFilter) return false;
      }
      return matchSearch(r, search, [
        "registration_number",
        "vehicle_serial",
        "client_name",
        "site_code",
        "owner_name",
        "owner_phone",
        "ownership",
        "engine_number",
        "chassis_number",
        "site_manager_names",
        "vehicle_type_name",
        "make_model",
        "approval_status",
      ]);
    });
  }, [rows, search, statusFilter, siteFilter]);

  function exportVehicles() {
    downloadExcel({
      filename: `vehicles-${excelStamp()}.xlsx`,
      sheetName: "Vehicles",
      rows: filteredRows,
      columns: [
        { header: "Registration", value: (r) => r.registration_number },
        { header: "Serial", value: (r) => r.vehicle_serial || "" },
        { header: "Type", value: (r) => r.vehicle_type_name || r.make_model || "" },
        { header: "Year", value: (r) => r.manufacture_year || "" },
        { header: "Ownership", value: (r) => ownershipLabel(r.ownership) },
        {
          header: "Status",
          value: (r) => APPROVAL_STATUS_LABEL[r.approval_status] || r.approval_status || "",
        },
        { header: "Site", value: (r) => r.client_name || "" },
        { header: "Site code", value: (r) => r.site_code || "" },
        { header: "Owner", value: (r) => r.owner_name || "" },
        { header: "Owner phone", value: (r) => r.owner_phone || "" },
        { header: "Site manager", value: (r) => r.site_manager_names || "" },
        { header: "Engine", value: (r) => r.engine_number || "" },
        { header: "Chassis", value: (r) => r.chassis_number || "" },
        { header: "Fuel", value: (r) => r.fuel_type || "" },
        { header: "Seating", value: (r) => r.seating_capacity || "" },
      ],
    });
  }

  function onSiteChange(clientId, setState, current) {
    const sm = smForSite(clients, clientId);
    setState({
      ...current,
      client_id: clientId,
      site_manager_id: sm.id,
    });
  }

  async function create(e) {
    e.preventDefault();
    setFormErr("");
    const reg = normalizeVehicleRegistration(form.registration_number);
    if (!reg) {
      setFormErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
      return;
    }
    const sm = smForSite(clients, form.client_id);
    try {
      await api.post("/admin/vehicles", {
        client_id: Number(form.client_id),
        registration_number: reg,
        vehicle_type_id: form.vehicle_type_id === "" ? null : Number(form.vehicle_type_id),
        site_manager_id: sm.id ? Number(sm.id) : null,
        is_active: form.is_active !== false,
        ...detailsPayload(form),
      });
      setForm(emptyForm());
      setShowAdd(false);
      setFormErr("");
      load();
    } catch (ex) {
      setFormErr(ex.response?.data?.error || ex.message);
    }
  }

  function openEdit(row) {
    setEditErr("");
    const sm = smForSite(clients, row.client_id);
    setEditing({
      id: row.id,
      client_id: String(row.client_id),
      site_manager_id: sm.id || (row.site_manager_id != null ? String(row.site_manager_id) : ""),
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
    const sm = smForSite(clients, editing.client_id);
    try {
      await api.patch(`/admin/vehicles/${editing.id}`, {
        client_id: Number(editing.client_id),
        registration_number: reg,
        vehicle_type_id: editing.vehicle_type_id === "" ? null : Number(editing.vehicle_type_id),
        site_manager_id: sm.id ? Number(sm.id) : null,
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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Vehicles</h1>
          <p className="text-sm text-slate-600 mt-1">
            All vehicles are listed below. Site managers normally submit vehicles for review — use{" "}
            <a className="text-btt-navy font-medium underline" href="/admin/vehicle-approvals">
              Vehicle approvals
            </a>
            . Use <strong>Add vehicle</strong> only when admin needs to add one.
          </p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
            showAdd ? "border border-slate-300 bg-white text-slate-700" : "bg-btt-navy text-white"
          }`}
          onClick={() => {
            setShowAdd((v) => !v);
            setFormErr("");
            if (showAdd) setForm(emptyForm());
          }}
          aria-expanded={showAdd}
        >
          {showAdd ? "Hide add form" : "Add vehicle"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={create}
          className="bg-white p-4 rounded-xl border border-slate-200 mb-6 space-y-4 shadow-sm"
        >
          <div className="text-sm font-semibold text-btt-navy">New vehicle</div>
          <p className="text-sm text-slate-600">
            Vehicle number in CAPS with no hyphen, e.g.{" "}
            <span className="font-mono font-semibold">KA01MM1234</span>. Site serial is assigned
            automatically. Site manager is loaded from the selected site.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={form.client_id}
              onChange={(e) => onSiteChange(e.target.value, setForm, form)}
              required
            >
              <option value="">Site *</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>

            <div className="border rounded-lg px-3 py-2 bg-slate-50 text-sm text-slate-700">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                Site manager
              </div>
              <div className="mt-0.5">
                {form.client_id ? formSm.label : "Select a site to load site manager"}
              </div>
            </div>
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
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300"
              onClick={() => {
                setShowAdd(false);
                setForm(emptyForm());
                setFormErr("");
              }}
            >
              Cancel
            </button>
            <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 px-4 font-medium">
              Save vehicle
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <ListToolbar
          title="All vehicles"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search registration, serial, owner, chassis, type…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "", label: "All statuses" },
                { value: "approved", label: "Approved" },
                { value: "pending_review", label: "Pending review" },
                { value: "draft", label: "Draft" },
                { value: "rejected", label: "Rejected" },
              ],
            },
            {
              key: "site",
              label: "Site",
              value: siteFilter,
              onChange: setSiteFilter,
              options: siteOptions,
            },
          ]}
          onExport={exportVehicles}
          exportDisabled={!filteredRows.length}
        />
        <div className="px-4 py-2 border-b bg-white text-xs text-slate-600">
          <span className="font-semibold text-amber-800">Amber</span> = pending review ·{" "}
          <span className="font-semibold text-orange-800">Orange</span> = over SLA age
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Reg</th>
              <th className="text-left p-3">Serial</th>
              <th className="text-left p-3">Type / year</th>
              <th className="text-left p-3">Ownership</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Site</th>
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
                  {rows.length
                    ? "No vehicles match your search."
                    : "No vehicles yet. Click Add vehicle to create one."}
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
                onChange={(e) => onSiteChange(e.target.value, setEditing, editing)}
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {clientLabel(c)}
                  </option>
                ))}
              </select>

              <div className="border rounded-lg px-3 py-2 bg-slate-50 text-sm text-slate-700">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                  Site manager
                </div>
                <div className="mt-0.5">{editSm.label}</div>
              </div>

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
