import { useEffect, useState } from "react";
import api from "../../api";
import { VENDOR_TYPE_OPTIONS } from "../../constants/vehicleFields";
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
});

function fromRow(c) {
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
  };
}

function payload(form) {
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
  };
}

export default function AdminClients() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await api.get("/clients");
    setRows(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/clients", payload(form));
      setForm(emptyForm());
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.patch(`/clients/${editing.id}`, payload(editing));
      setEditing(null);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  const fields = (value, setValue) => (
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
          SLA — max vehicle age (years). Leave blank for no limit. Example: 3 = vehicles must be under 3 years from date of
          registration.
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
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Clients / Sites</h1>
      {err && <p className="mb-3 text-sm text-red-700">{err}</p>}
      <form onSubmit={create} className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid md:grid-cols-2 gap-3">
        {fields(form, setForm)}
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
              <th className="text-left p-3">Vendor</th>
              <th className="text-left p-3">Start / age</th>
              <th className="text-left p-3">SLA age</th>
              <th className="text-left p-3">Lat, Lng</th>
              <th className="text-left p-3 w-20"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 font-mono">{c.site_code || "—"}</td>
                <td className="p-3">{c.vendor_type || "—"}</td>
                <td className="p-3">
                  {c.start_date ? String(c.start_date).slice(0, 10) : "—"}
                  {c.site_age_years != null ? ` · ${c.site_age_years}y` : ""}
                </td>
                <td className="p-3">{c.sla_max_age_years ? `< ${c.sla_max_age_years} yrs` : "—"}</td>
                <td className="p-3 text-xs">
                  {c.latitude != null && c.longitude != null ? `${c.latitude}, ${c.longitude}` : "—"}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-btt-navy font-medium hover:underline"
                    onClick={() => setEditing({ id: c.id, ...fromRow(c) })}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
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
            {fields(editing, setEditing)}
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
