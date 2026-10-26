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
import { clientLabel, formatRegInput, formatSiteCodeInput, isSlaExceeded, normalizeVehicleRegistration } from "../../utils/vehicleReg";

const emptySite = () => ({
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
});

const emptyVehicle = () => ({
  client_id: "",
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
    account_manager_user_id: form.account_manager_user_id === "" ? null : Number(form.account_manager_user_id),
  };
}

export default function AdminClients() {
  const [sites, setSites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [siteFilter, setSiteFilter] = useState("");
  const [search, setSearch] = useState("");
  const [siteForm, setSiteForm] = useState(emptySite);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingSite, setEditingSite] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [err, setErr] = useState("");
  const [vehicleErr, setVehicleErr] = useState("");

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

  const managersForVehicleForm = useMemo(() => {
    const cid = vehicleForm.client_id || siteFilter;
    if (!cid) return [];
    return managers.filter((m) => String(m.client_id) === String(cid));
  }, [managers, vehicleForm.client_id, siteFilter]);

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

  async function createSite(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/clients", sitePayload(siteForm));
      setSiteForm(emptySite());
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function saveSite(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.patch(`/clients/${editingSite.id}`, sitePayload(editingSite));
      setEditingSite(null);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function createVehicle(e) {
    e.preventDefault();
    setVehicleErr("");
    const clientId = vehicleForm.client_id || siteFilter;
    if (!clientId) {
      setVehicleErr("Select a site first");
      return;
    }
    const reg = normalizeVehicleRegistration(vehicleForm.registration_number);
    if (!reg) {
      setVehicleErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
      return;
    }
    try {
      await api.post("/admin/vehicles", {
        client_id: Number(clientId),
        registration_number: reg,
        vehicle_type_id: vehicleForm.vehicle_type_id === "" ? null : Number(vehicleForm.vehicle_type_id),
        site_manager_id: vehicleForm.site_manager_id === "" ? null : Number(vehicleForm.site_manager_id),
        is_active: vehicleForm.is_active !== false,
        ...detailsPayload(vehicleForm),
      });
      setVehicleForm(emptyVehicle());
      load();
    } catch (ex) {
      setVehicleErr(ex.response?.data?.error || ex.message);
    }
  }

  function openEditVehicle(row) {
    setVehicleErr("");
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
    setVehicleErr("");
    const reg = normalizeVehicleRegistration(editingVehicle.registration_number);
    if (!reg) {
      setVehicleErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
      return;
    }
    try {
      await api.patch(`/admin/vehicles/${editingVehicle.id}`, {
        client_id: Number(editingVehicle.client_id),
        registration_number: reg,
        vehicle_type_id: editingVehicle.vehicle_type_id === "" ? null : Number(editingVehicle.vehicle_type_id),
        site_manager_id: editingVehicle.site_manager_id === "" ? null : Number(editingVehicle.site_manager_id),
        is_active: editingVehicle.is_active !== false,
        ...detailsPayload(editingVehicle),
      });
      setEditingVehicle(null);
      load();
    } catch (ex) {
      setVehicleErr(ex.response?.data?.error || ex.message);
    }
  }

  const siteFields = (value, setValue) => (
    <>
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Site / company name *"
        value={value.name}
        onChange={(e) => setValue({ ...value, name: e.target.value })}
        required
      />
      <input
        className="border rounded-lg px-3 py-2 font-mono uppercase"
        placeholder="Site code * (5 chars, e.g. INFNG)"
        maxLength={5}
        value={value.site_code}
        onChange={(e) => setValue({ ...value, site_code: formatSiteCodeInput(e.target.value) })}
        required
      />
      <select
        className="border rounded-lg px-3 py-2 bg-white md:col-span-2"
        value={value.account_manager_user_id}
        onChange={(e) => setValue({ ...value, account_manager_user_id: e.target.value })}
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
        value={value.email}
        onChange={(e) => setValue({ ...value, email: e.target.value })}
      />
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Phone"
        value={value.phone}
        onChange={(e) => setValue({ ...value, phone: e.target.value })}
      />
      <input
        className="border rounded-lg px-3 py-2 md:col-span-2"
        placeholder="Address"
        value={value.address}
        onChange={(e) => setValue({ ...value, address: e.target.value })}
      />
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Latitude"
        value={value.latitude}
        onChange={(e) => setValue({ ...value, latitude: e.target.value })}
      />
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Longitude"
        value={value.longitude}
        onChange={(e) => setValue({ ...value, longitude: e.target.value })}
      />
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">Site start date</span>
        <input
          className="mt-1 w-full border rounded-lg px-3 py-2"
          type="date"
          value={value.start_date}
          onChange={(e) => setValue({ ...value, start_date: e.target.value })}
        />
      </label>
      <select
        className="border rounded-lg px-3 py-2 bg-white"
        value={value.vendor_type}
        onChange={(e) => setValue({ ...value, vendor_type: e.target.value })}
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
          value={value.sla_max_age_years}
          onChange={(e) => setValue({ ...value, sla_max_age_years: e.target.value.replace(/\D/g, "").slice(0, 2) })}
        />
      </label>
    </>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Sites &amp; Vehicles</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage sites and their vehicles on one screen. Database tables stay separate (
          <code className="text-xs">clients</code>, <code className="text-xs">vehicles</code>
          ).
        </p>
      </div>

      {err && <p className="text-sm text-red-700">{err}</p>}

      <section>
        <h2 className="text-lg font-semibold text-btt-navy mb-3">1. Sites</h2>
        <form onSubmit={createSite} className="bg-white p-4 rounded-xl border border-slate-200 mb-4 grid md:grid-cols-2 gap-3">
          {siteFields(siteForm, setSiteForm)}
          <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 md:col-span-2">
            Add site
          </button>
        </form>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Site</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Account manager</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">SLA</th>
                <th className="text-left p-3 w-20"> </th>
              </tr>
            </thead>
            <tbody>
              {sites.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-slate-100 ${
                    String(siteFilter) === String(c.id) ? "bg-sky-50" : ""
                  }`}
                >
                  <td className="p-3 font-medium">
                    <button
                      type="button"
                      className="text-left hover:underline text-btt-navy"
                      onClick={() => {
                        setSiteFilter(String(c.id));
                        setVehicleForm((f) => ({ ...f, client_id: String(c.id), site_manager_id: "" }));
                      }}
                      title="Filter vehicles for this site"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="p-3 font-mono">{c.site_code || "—"}</td>
                  <td className="p-3 text-slate-600">{c.account_manager_names || "—"}</td>
                  <td className="p-3">{c.vendor_type || "—"}</td>
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
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-btt-navy">2. Vehicles</h2>
            <p className="text-xs text-slate-500">Click a site name above, or pick a filter, to focus one site.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={siteFilter}
              onChange={(e) => {
                setSiteFilter(e.target.value);
                setVehicleForm((f) => ({
                  ...f,
                  client_id: e.target.value,
                  site_manager_id: "",
                }));
              }}
            >
              <option value="">All sites</option>
              {sites.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
            <input
              className="border rounded-lg px-3 py-2 text-sm min-w-[220px]"
              placeholder="Search vehicles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <form
          onSubmit={createVehicle}
          className="bg-white p-4 rounded-xl border border-slate-200 mb-4 space-y-4 shadow-sm"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={vehicleForm.client_id || siteFilter}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  client_id: e.target.value,
                  site_manager_id: "",
                })
              }
              required
            >
              <option value="">Client / site *</option>
              {sites.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-2"
              value={vehicleForm.site_manager_id}
              onChange={(e) => setVehicleForm({ ...vehicleForm, site_manager_id: e.target.value })}
              disabled={!(vehicleForm.client_id || siteFilter)}
            >
              <option value="">Site manager (optional)</option>
              {managersForVehicleForm.map((m) => (
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
              value={vehicleForm.registration_number}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, registration_number: formatRegInput(e.target.value) })
              }
              required
            />
          </label>
          <VehicleInfoFields value={vehicleForm} onChange={setVehicleForm} vehicleTypes={vehicleTypes} />
          {vehicleErr && !editingVehicle && <p className="text-red-600 text-sm">{vehicleErr}</p>}
          <button type="submit" className="bg-btt-navy text-white rounded-lg py-2 px-4 font-medium">
            Add vehicle
          </button>
        </form>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Reg</th>
                <th className="text-left p-3">Serial</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Ownership</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Site</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3 w-24"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => {
                const pending = v.approval_status === "pending_review";
                const slaOver = isSlaExceeded(v);
                return (
                  <tr
                    key={v.id}
                    className={`border-t border-slate-100 ${
                      slaOver ? "bg-orange-100" : pending ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="p-3 font-mono font-medium">{v.registration_number}</td>
                    <td className="p-3 font-mono text-xs">{v.vehicle_serial || "—"}</td>
                    <td className="p-3">{v.vehicle_type_name || v.make_model || "—"}</td>
                    <td className="p-3">{ownershipLabel(v.ownership)}</td>
                    <td className="p-3">{v.approval_status || "—"}</td>
                    <td className="p-3">
                      {v.client_name}
                      {v.site_code ? ` (${v.site_code})` : ""}
                    </td>
                    <td className="p-3">{v.owner_name || "—"}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => openEditVehicle(v)}
                        className="text-btt-navy font-medium hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredVehicles.length && (
                <tr>
                  <td colSpan={8} className="p-4 text-slate-500">
                    No vehicles for this filter.
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
            {siteFields(editingSite, setEditingSite)}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setEditingSite(null)}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-btt-navy text-white">
                Save
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
              <VehicleInfoFields value={editingVehicle} onChange={setEditingVehicle} vehicleTypes={vehicleTypes} dense />
              {vehicleErr && <p className="text-red-600 text-sm">{vehicleErr}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setEditingVehicle(null)}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-btt-navy text-white">
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
