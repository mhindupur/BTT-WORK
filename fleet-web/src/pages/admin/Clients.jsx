import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import VehicleInfoFields from "../../components/VehicleInfoFields";
import {
  detailsFromVehicleRow,
  detailsPayload,
  emptyVehicleDetails,
  ownershipLabel,
  VENDOR_TYPE_OPTIONS,
} from "../../constants/vehicleFields";
import {
  clientLabel,
  formatRegInput,
  formatSiteCodeInput,
  isSlaExceeded,
  normalizeVehicleRegistration,
} from "../../utils/vehicleReg";

const emptyCombined = () => ({
  // site mode: new | existing
  site_mode: "new",
  existing_client_id: "",
  // site fields (used when site_mode === "new")
  name: "",
  site_code: "",
  email: "",
  phone: "",
  address: "",
  latitude: "",
  longitude: "",
  start_date: "",
  vendor_type: "",
  sla_max_age_years: "",
  account_manager_user_id: "",
  // vehicle + assignment
  site_manager_id: "",
  vehicle_type_id: "",
  registration_number: "",
  is_active: true,
  ...emptyVehicleDetails(),
});

function siteFromRow(c) {
  return {
    name: c.name || "",
    site_code: c.site_code || "",
    email: c.email || "",
    phone: c.phone || "",
    address: c.address || "",
    latitude: c.latitude != null ? String(c.latitude) : "",
    longitude: c.longitude != null ? String(c.longitude) : "",
    start_date: c.start_date ? String(c.start_date).slice(0, 10) : "",
    vendor_type: c.vendor_type || "",
    sla_max_age_years: c.sla_max_age_years != null ? String(c.sla_max_age_years) : "",
    account_manager_user_id:
      Array.isArray(c.account_manager_user_ids) && c.account_manager_user_ids[0]
        ? String(c.account_manager_user_ids[0])
        : "",
  };
}

function sitePayload(form) {
  return {
    name: form.name,
    site_code: form.site_code,
    email: form.email || null,
    phone: form.phone || null,
    address: form.address || null,
    latitude: form.latitude === "" ? null : Number(form.latitude),
    longitude: form.longitude === "" ? null : Number(form.longitude),
    start_date: form.start_date || null,
    vendor_type: form.vendor_type || null,
    sla_max_age_years: form.sla_max_age_years === "" ? null : Number(form.sla_max_age_years),
    account_manager_user_id:
      form.account_manager_user_id === "" ? null : Number(form.account_manager_user_id),
  };
}

export default function AdminClients() {
  const [sites, setSites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [form, setForm] = useState(emptyCombined);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editErr, setEditErr] = useState("");

  async function load() {
    const [c, v, sm, am, vt] = await Promise.all([
      api.get("/clients"),
      api.get("/admin/vehicles"),
      api.get("/site-managers"),
      api.get("/account-managers"),
      api.get("/vehicle-types"),
    ]);
    setSites(c.data);
    setVehicles(v.data);
    setManagers(sm.data);
    setAccountManagers(am.data);
    setVehicleTypes(vt.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const managersForForm = useMemo(() => {
    if (form.site_mode !== "existing" || !form.existing_client_id) return [];
    return managers.filter((m) => String(m.client_id) === String(form.existing_client_id));
  }, [managers, form.site_mode, form.existing_client_id]);

  const managersForEditVehicle = useMemo(() => {
    if (!editingVehicle?.client_id) return [];
    return managers.filter((m) => String(m.client_id) === String(editingVehicle.client_id));
  }, [managers, editingVehicle?.client_id]);

  const filteredVehicles = useMemo(() => {
    let rows = vehicles;
    if (siteFilter) rows = rows.filter((r) => String(r.client_id) === String(siteFilter));
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.registration_number,
        r.vehicle_serial,
        r.client_name,
        r.site_code,
        r.owner_name,
        r.ownership,
        r.site_manager_names,
        r.vehicle_type_name,
        r.approval_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [vehicles, siteFilter, search]);

  async function submitCombined(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const reg = normalizeVehicleRegistration(form.registration_number);
      if (!reg) {
        setErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
        return;
      }

      let clientId = null;
      if (form.site_mode === "existing") {
        if (!form.existing_client_id) {
          setErr("Select an existing site, or switch to New site");
          return;
        }
        clientId = Number(form.existing_client_id);
      } else {
        if (!form.name?.trim() || !form.site_code?.trim()) {
          setErr("Site name and 5-character site code are required");
          return;
        }
        const { data: createdSite } = await api.post("/clients", sitePayload(form));
        clientId = createdSite.id;
      }

      await api.post("/admin/vehicles", {
        client_id: clientId,
        registration_number: reg,
        vehicle_type_id: form.vehicle_type_id === "" ? null : Number(form.vehicle_type_id),
        site_manager_id: form.site_manager_id === "" ? null : Number(form.site_manager_id),
        is_active: form.is_active !== false,
        ...detailsPayload(form),
      });

      setMsg(
        form.site_mode === "new"
          ? "Site and vehicle saved (separate tables: clients + vehicles)."
          : "Vehicle added to the selected site."
      );
      setForm(emptyCombined());
      setSiteFilter(String(clientId));
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveSite(e) {
    e.preventDefault();
    setEditErr("");
    try {
      await api.patch(`/clients/${editingSite.id}`, sitePayload(editingSite));
      setEditingSite(null);
      load();
    } catch (ex) {
      setEditErr(ex.response?.data?.error || ex.message);
    }
  }

  function openEditVehicle(row) {
    setEditErr("");
    setEditingVehicle({
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

  async function saveVehicle(e) {
    e.preventDefault();
    setEditErr("");
    const reg = normalizeVehicleRegistration(editingVehicle.registration_number);
    if (!reg) {
      setEditErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
      return;
    }
    try {
      await api.patch(`/admin/vehicles/${editingVehicle.id}`, {
        client_id: Number(editingVehicle.client_id),
        registration_number: reg,
        vehicle_type_id:
          editingVehicle.vehicle_type_id === "" ? null : Number(editingVehicle.vehicle_type_id),
        site_manager_id:
          editingVehicle.site_manager_id === "" ? null : Number(editingVehicle.site_manager_id),
        is_active: editingVehicle.is_active !== false,
        ...detailsPayload(editingVehicle),
      });
      setEditingVehicle(null);
      load();
    } catch (ex) {
      setEditErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Sites &amp; Vehicles</h1>
        <p className="text-sm text-slate-600 mt-1">
          One form captures site and vehicle together. Data is still stored in separate tables (
          <code className="text-xs">clients</code> and <code className="text-xs">vehicles</code>).
        </p>
      </div>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}

      <form
        onSubmit={submitCombined}
        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-semibold text-slate-700">Site</span>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="site_mode"
              checked={form.site_mode === "new"}
              onChange={() =>
                setForm({
                  ...form,
                  site_mode: "new",
                  existing_client_id: "",
                  site_manager_id: "",
                })
              }
            />
            New site
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="site_mode"
              checked={form.site_mode === "existing"}
              onChange={() => setForm({ ...form, site_mode: "existing", site_manager_id: "" })}
            />
            Existing site
          </label>
        </div>

        {form.site_mode === "existing" ? (
          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={form.existing_client_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  existing_client_id: e.target.value,
                  site_manager_id: "",
                })
              }
              required
            >
              <option value="">Select site *</option>
              {sites.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-2"
              value={form.site_manager_id}
              onChange={(e) => setForm({ ...form, site_manager_id: e.target.value })}
              disabled={!form.existing_client_id}
            >
              <option value="">Site manager (optional)</option>
              {managersForForm.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} — {m.email}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Site / company name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required={form.site_mode === "new"}
            />
            <input
              className="border rounded-lg px-3 py-2 font-mono uppercase"
              placeholder="Site code * (5 chars, e.g. INFNG)"
              maxLength={5}
              value={form.site_code}
              onChange={(e) => setForm({ ...form, site_code: formatSiteCodeInput(e.target.value) })}
              required={form.site_mode === "new"}
            />
            <select
              className="border rounded-lg px-3 py-2 bg-white md:col-span-2"
              value={form.account_manager_user_id}
              onChange={(e) => setForm({ ...form, account_manager_user_id: e.target.value })}
            >
              <option value="">Account manager (optional)</option>
              {accountManagers.map((am) => (
                <option key={am.id} value={am.id}>
                  {am.full_name} — {am.email}
                </option>
              ))}
            </select>
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Site email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Site phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 md:col-span-2"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Latitude"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Longitude"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Site start date</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </label>
            <select
              className="border rounded-lg px-3 py-2 bg-white"
              value={form.vendor_type}
              onChange={(e) => setForm({ ...form, vendor_type: e.target.value })}
            >
              <option value="">Vendor type</option>
              {VENDOR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">
                SLA — max vehicle age (years). Leave blank for no limit.
              </span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                type="number"
                min={1}
                max={30}
                placeholder="e.g. 3"
                value={form.sla_max_age_years}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sla_max_age_years: e.target.value.replace(/\D/g, "").slice(0, 2),
                  })
                }
              />
            </label>
            <p className="md:col-span-2 text-xs text-slate-500">
              Site manager can be assigned after the site exists (Site Managers page), or choose an
              existing site above if the manager is already linked.
            </p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <h2 className="text-sm font-semibold text-btt-navy uppercase tracking-wide">Vehicle</h2>
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
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-btt-navy text-white rounded-lg py-2.5 px-5 font-medium disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : form.site_mode === "new"
              ? "Save site + vehicle"
              : "Save vehicle to site"}
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-btt-navy">Records</h2>
          <div className="flex flex-wrap gap-2">
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
            >
              <option value="">All sites</option>
              {sites.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
            <input
              className="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 border-b bg-slate-50 text-xs font-semibold text-slate-600">
            Sites ({sites.length}) — click Edit to change site details / account manager
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Site</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Account manager</th>
                <th className="text-left p-3">SLA</th>
                <th className="text-left p-3 w-20"> </th>
              </tr>
            </thead>
            <tbody>
              {sites.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 font-mono">{c.site_code || "—"}</td>
                  <td className="p-3 text-slate-600">{c.account_manager_names || "—"}</td>
                  <td className="p-3">{c.sla_max_age_years ? `< ${c.sla_max_age_years} yrs` : "—"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-btt-navy font-medium hover:underline"
                      onClick={() => setEditingSite({ id: c.id, ...siteFromRow(c) })}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 border-b bg-slate-50 text-xs font-semibold text-slate-600">
            Vehicles ({filteredVehicles.length}
            {siteFilter ? " for filter" : ""})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Reg</th>
                <th className="text-left p-3">Serial</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Ownership</th>
                <th className="text-left p-3">Site</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3 w-20"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => (
                <tr
                  key={v.id}
                  className={`border-t border-slate-100 ${isSlaExceeded(v) ? "bg-orange-50" : ""}`}
                >
                  <td className="p-3 font-mono font-medium">{v.registration_number}</td>
                  <td className="p-3 font-mono text-xs">{v.vehicle_serial || "—"}</td>
                  <td className="p-3">{v.vehicle_type_name || v.make_model || "—"}</td>
                  <td className="p-3">{ownershipLabel(v.ownership)}</td>
                  <td className="p-3">
                    {v.client_name}
                    {v.site_code ? ` (${v.site_code})` : ""}
                  </td>
                  <td className="p-3">{v.owner_name || "—"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-btt-navy font-medium hover:underline"
                      onClick={() => openEditVehicle(v)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredVehicles.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500">
                    No vehicles yet. Use the form above to add site + vehicle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingSite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={saveSite}
            className="bg-white rounded-xl border shadow-xl max-w-2xl w-full p-6 grid md:grid-cols-2 gap-3 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold text-btt-navy md:col-span-2">Edit site</h2>
            <input
              className="border rounded-lg px-3 py-2"
              value={editingSite.name}
              onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
              required
            />
            <input
              className="border rounded-lg px-3 py-2 font-mono uppercase"
              maxLength={5}
              value={editingSite.site_code}
              onChange={(e) =>
                setEditingSite({ ...editingSite, site_code: formatSiteCodeInput(e.target.value) })
              }
              required
            />
            <select
              className="border rounded-lg px-3 py-2 bg-white md:col-span-2"
              value={editingSite.account_manager_user_id}
              onChange={(e) =>
                setEditingSite({ ...editingSite, account_manager_user_id: e.target.value })
              }
            >
              <option value="">Account manager (optional)</option>
              {accountManagers.map((am) => (
                <option key={am.id} value={am.id}>
                  {am.full_name} — {am.email}
                </option>
              ))}
            </select>
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Email"
              value={editingSite.email}
              onChange={(e) => setEditingSite({ ...editingSite, email: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Phone"
              value={editingSite.phone}
              onChange={(e) => setEditingSite({ ...editingSite, phone: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 md:col-span-2"
              placeholder="Address"
              value={editingSite.address}
              onChange={(e) => setEditingSite({ ...editingSite, address: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Latitude"
              value={editingSite.latitude}
              onChange={(e) => setEditingSite({ ...editingSite, latitude: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Longitude"
              value={editingSite.longitude}
              onChange={(e) => setEditingSite({ ...editingSite, longitude: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2"
              type="date"
              value={editingSite.start_date}
              onChange={(e) => setEditingSite({ ...editingSite, start_date: e.target.value })}
            />
            <select
              className="border rounded-lg px-3 py-2 bg-white"
              value={editingSite.vendor_type}
              onChange={(e) => setEditingSite({ ...editingSite, vendor_type: e.target.value })}
            >
              <option value="">Vendor type</option>
              {VENDOR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className="border rounded-lg px-3 py-2 md:col-span-2"
              type="number"
              min={1}
              max={30}
              placeholder="SLA max age years"
              value={editingSite.sla_max_age_years}
              onChange={(e) =>
                setEditingSite({
                  ...editingSite,
                  sla_max_age_years: e.target.value.replace(/\D/g, "").slice(0, 2),
                })
              }
            />
            {editErr && <p className="text-red-600 text-sm md:col-span-2">{editErr}</p>}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setEditingSite(null)}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-btt-navy text-white">
                Save site
              </button>
            </div>
          </form>
        </div>
      )}

      {editingVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold text-btt-navy">Edit vehicle</h2>
            <form onSubmit={saveVehicle} className="space-y-4">
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={editingVehicle.client_id}
                onChange={(e) =>
                  setEditingVehicle({
                    ...editingVehicle,
                    client_id: e.target.value,
                    site_manager_id: "",
                  })
                }
                required
              >
                {sites.map((c) => (
                  <option key={c.id} value={c.id}>
                    {clientLabel(c)}
                  </option>
                ))}
              </select>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={editingVehicle.site_manager_id}
                onChange={(e) => setEditingVehicle({ ...editingVehicle, site_manager_id: e.target.value })}
              >
                <option value="">Site manager (optional)</option>
                {managersForEditVehicle.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} — {m.email}
                  </option>
                ))}
              </select>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono uppercase"
                value={editingVehicle.registration_number}
                onChange={(e) =>
                  setEditingVehicle({
                    ...editingVehicle,
                    registration_number: formatRegInput(e.target.value),
                  })
                }
              />
              <VehicleInfoFields
                value={editingVehicle}
                onChange={setEditingVehicle}
                vehicleTypes={vehicleTypes}
                dense
              />
              {editErr && <p className="text-red-600 text-sm">{editErr}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border"
                  onClick={() => setEditingVehicle(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-btt-navy text-white">
                  Save vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
