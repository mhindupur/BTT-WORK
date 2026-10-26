import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import PasswordInput from "../../components/PasswordInput";
import { VENDOR_TYPE_OPTIONS } from "../../constants/vehicleFields";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";
import { formatSiteCodeInput } from "../../utils/vehicleReg";

const emptyForm = () => ({
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
  sm_full_name: "",
  sm_email: "",
  sm_phone: "",
  sm_password: "",
  sm_location_label: "",
});

function fromRow(c) {
  const hasSm = Boolean(c.site_manager_id);
  return {
    id: c.id,
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
    sm_full_name: c.site_manager_name || "",
    sm_email: c.site_manager_email || "",
    sm_phone: c.site_manager_phone || "",
    sm_password: "",
    sm_location_label: c.site_manager_location || "",
    _creatingSm: !hasSm,
    _allowSmEmailEdit: !hasSm,
  };
}

function sitePayload(form, { includeSmPassword = true } = {}) {
  const payload = {
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
    site_manager: {
      full_name: form.sm_full_name,
      email: form.sm_email,
      phone: form.sm_phone || null,
      location_label: form.sm_location_label || null,
    },
  };
  if (includeSmPassword && form.sm_password) {
    payload.site_manager.password = form.sm_password;
  }
  return payload;
}

export default function AdminClients() {
  const [rows, setRows] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  async function load() {
    const [c, am] = await Promise.all([api.get("/clients"), api.get("/account-managers")]);
    setRows(c.data);
    setAccountManagers(am.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const vendorOptions = useMemo(
    () => uniqueOptions(rows, "vendor_type", { emptyLabel: "All vendor types" }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (vendorFilter && (r.vendor_type || "") !== vendorFilter) return false;
      return matchSearch(r, search, [
        "name",
        "site_code",
        "email",
        "phone",
        "address",
        "site_manager_name",
        "site_manager_email",
        "account_manager_names",
        "vendor_type",
      ]);
    });
  }, [rows, search, vendorFilter]);

  function exportSites() {
    downloadExcel({
      filename: `sites-${excelStamp()}.xlsx`,
      sheetName: "Sites",
      rows: filteredRows,
      columns: [
        { header: "Site", value: (r) => r.name || "" },
        { header: "Code", value: (r) => r.site_code || "" },
        { header: "Email", value: (r) => r.email || "" },
        { header: "Phone", value: (r) => r.phone || "" },
        { header: "Vendor type", value: (r) => r.vendor_type || "" },
        { header: "SLA max age (yrs)", value: (r) => r.sla_max_age_years ?? "" },
        { header: "Site manager", value: (r) => r.site_manager_name || "" },
        { header: "Site manager email", value: (r) => r.site_manager_email || "" },
        { header: "Account manager", value: (r) => r.account_manager_names || "" },
        { header: "Address", value: (r) => r.address || "" },
      ],
    });
  }

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!form.sm_password || form.sm_password.length < 6) {
      setErr("Site manager password is required (min 6 characters)");
      return;
    }
    try {
      await api.post("/clients", sitePayload(form, { includeSmPassword: true }));
      setMsg("Site and site manager created. Account manager linked if selected.");
      setForm(emptyForm());
      setShowAdd(false);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setErr("");
    const creatingSm = Boolean(editing._creatingSm);
    if (creatingSm && (!editing.sm_password || editing.sm_password.length < 6)) {
      setErr("Site manager password is required (min 6 characters) when adding a site manager");
      return;
    }
    try {
      const payload = sitePayload(editing, {
        includeSmPassword: creatingSm || Boolean(editing.sm_password),
      });
      if (editing.sm_email) payload.site_manager.email = editing.sm_email;
      await api.patch(`/clients/${editing.id}`, payload);
      setEditing(null);
      setMsg("Site updated.");
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  const siteFields = (value, setValue, { createMode }) => (
    <>
      <div className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Site details
      </div>
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Site name *"
        value={value.name}
        onChange={(e) => setValue({ ...value, name: e.target.value })}
        required
      />
      <input
        className="border rounded-lg px-3 py-2 font-mono uppercase"
        placeholder="Site code * (5 chars)"
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
        placeholder="Site email"
        value={value.email}
        onChange={(e) => setValue({ ...value, email: e.target.value })}
      />
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Site phone"
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
        <span className="text-xs font-semibold text-slate-600">SLA — max vehicle age (years)</span>
        <input
          className="mt-1 w-full border rounded-lg px-3 py-2"
          type="number"
          min={1}
          max={30}
          placeholder="e.g. 3"
          value={value.sla_max_age_years}
          onChange={(e) =>
            setValue({ ...value, sla_max_age_years: e.target.value.replace(/\D/g, "").slice(0, 2) })
          }
        />
      </label>

      <div className="md:col-span-2 border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Site manager (created with this site)
      </div>
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Site manager full name *"
        value={value.sm_full_name}
        onChange={(e) => setValue({ ...value, sm_full_name: e.target.value })}
        required
      />
      <input
        className="border rounded-lg px-3 py-2"
        type="email"
        placeholder="Site manager email *"
        value={value.sm_email}
        onChange={(e) => setValue({ ...value, sm_email: e.target.value })}
        required
        disabled={!createMode && Boolean(value.sm_email) && !value._allowSmEmailEdit}
        title={
          !createMode && value.sm_email && !value._allowSmEmailEdit
            ? "Login email cannot be changed here"
            : undefined
        }
      />
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Site manager phone"
        value={value.sm_phone}
        onChange={(e) => setValue({ ...value, sm_phone: e.target.value })}
      />
      <input
        className="border rounded-lg px-3 py-2"
        placeholder="Location label (optional)"
        value={value.sm_location_label}
        onChange={(e) => setValue({ ...value, sm_location_label: e.target.value })}
      />
      <div className="md:col-span-2">
        <PasswordInput
          placeholder={
            createMode
              ? "Site manager password * (min 6)"
              : "New site manager password (leave blank to keep)"
          }
          value={value.sm_password}
          onChange={(e) => setValue({ ...value, sm_password: e.target.value })}
          required={createMode}
        />
      </div>
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Sites</h1>
          <p className="text-sm text-slate-600 mt-1">
            All sites are listed below. Use <strong>Add site</strong> when you need to create a site with
            its site manager and optional account manager.
          </p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
            showAdd
              ? "border border-slate-300 bg-white text-slate-700"
              : "bg-btt-navy text-white"
          }`}
          onClick={() => {
            setShowAdd((v) => !v);
            setErr("");
            if (showAdd) setForm(emptyForm());
          }}
          aria-expanded={showAdd}
        >
          {showAdd ? "Hide add form" : "Add site"}
        </button>
      </div>

      {msg && <p className="mb-3 text-sm text-green-700">{msg}</p>}
      {err && showAdd && <p className="mb-3 text-sm text-red-700">{err}</p>}

      {showAdd && (
        <form
          onSubmit={create}
          className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid md:grid-cols-2 gap-3 shadow-sm"
        >
          <div className="md:col-span-2 text-sm font-semibold text-btt-navy">
            New site + site manager
          </div>
          {siteFields(form, setForm, { createMode: true })}
          <div className="md:col-span-2 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300"
              onClick={() => {
                setShowAdd(false);
                setForm(emptyForm());
                setErr("");
              }}
            >
              Cancel
            </button>
            <button type="submit" className="bg-btt-navy text-white rounded-lg px-4 py-2 font-medium">
              Save site
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="All sites"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search site, code, manager, account manager…"
          filters={[
            {
              key: "vendor",
              label: "Vendor type",
              value: vendorFilter,
              onChange: setVendorFilter,
              options: vendorOptions,
            },
          ]}
          onExport={exportSites}
          exportDisabled={!filteredRows.length}
        />
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Site</th>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Site manager</th>
              <th className="text-left p-3">Account manager</th>
              <th className="text-left p-3">SLA</th>
              <th className="text-left p-3 w-20"> </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 font-mono">{c.site_code || "—"}</td>
                <td className="p-3">
                  {c.site_manager_name || "—"}
                  {c.site_manager_email ? (
                    <div className="text-xs text-slate-500">{c.site_manager_email}</div>
                  ) : null}
                </td>
                <td className="p-3 text-slate-600">{c.account_manager_names || "—"}</td>
                <td className="p-3">{c.sla_max_age_years ? `< ${c.sla_max_age_years} yrs` : "—"}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-btt-navy font-medium hover:underline"
                    onClick={() => setEditing(fromRow(c))}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">
                  {rows.length
                    ? "No sites match your filter."
                    : (
                      <>
                        No sites yet. Click <strong>Add site</strong> to create the first one.
                      </>
                    )}
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
            className="bg-white rounded-xl border shadow-xl max-w-2xl w-full p-6 grid md:grid-cols-2 gap-3 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold text-btt-navy md:col-span-2">Edit site</h2>
            {siteFields(editing, setEditing, { createMode: false })}
            <div className="md:col-span-2 flex justify-end gap-2">
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
    </div>
  );
}
