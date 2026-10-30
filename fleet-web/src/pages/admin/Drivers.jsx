import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";
import { clientLabel } from "../../utils/vehicleReg";

const emptyForm = () => ({
  client_id: "",
  vehicle_id: "",
  full_name: "",
  phone: "",
  license_number: "",
  license_expiry: "",
  notes: "",
  is_active: true,
});

export default function AdminDrivers() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  async function load() {
    const [d, c, v] = await Promise.all([
      api.get("/admin/drivers"),
      api.get("/clients"),
      api.get("/admin/vehicles"),
    ]);
    setRows(d.data);
    setClients(c.data);
    setVehicles(v.data);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  const siteOptions = useMemo(
    () => uniqueOptions(rows, "client_name", { emptyLabel: "All sites" }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (siteFilter && r.client_name !== siteFilter) return false;
      return matchSearch(r, search, [
        "full_name",
        "phone",
        "license_number",
        "client_name",
        "vehicle_registration",
        "license_doc_status",
      ]);
    });
  }, [rows, search, siteFilter]);

  const vehiclesForSite = useMemo(() => {
    if (!form.client_id) return [];
    return vehicles.filter((v) => String(v.client_id) === String(form.client_id));
  }, [vehicles, form.client_id]);

  function exportDrivers() {
    downloadExcel({
      filename: `drivers-${excelStamp()}.xlsx`,
      sheetName: "Drivers",
      rows: filteredRows,
      columns: [
        { header: "Name", value: (r) => r.full_name || "" },
        { header: "Phone", value: (r) => r.phone || "" },
        { header: "License no", value: (r) => r.license_number || "" },
        { header: "License expiry", value: (r) => (r.license_expiry ? String(r.license_expiry).slice(0, 10) : "") },
        { header: "DL status", value: (r) => r.license_doc_status || "" },
        { header: "Site", value: (r) => r.client_name || "" },
        { header: "Vehicle", value: (r) => r.vehicle_registration || "" },
      ],
    });
  }

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/admin/drivers", {
        ...form,
        client_id: Number(form.client_id),
        vehicle_id: form.vehicle_id === "" ? null : Number(form.vehicle_id),
        license_expiry: form.license_expiry || null,
      });
      setForm(emptyForm());
      setShowAdd(false);
      setMsg("Driver added. Expiry reminders will use this DL date + WhatsApp phone.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function approveLicense(row) {
    setErr("");
    try {
      await api.post(`/admin/drivers/${row.id}/approve-license`);
      setMsg(`Driving license approved for ${row.full_name}.`);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function rejectLicense(row) {
    const note = window.prompt("Rejection reason", "Please re-upload a clear renewed DL");
    if (!note || !note.trim()) return;
    setErr("");
    try {
      await api.post(`/admin/drivers/${row.id}/reject-license`, { rejection_note: note.trim() });
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Drivers</h1>
          <p className="text-sm text-slate-600 mt-1">
            Driver WhatsApp number + driving license expiry power renewal reminders (30 / 15 / 7 days, then daily).
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
          }}
        >
          {showAdd ? "Hide add form" : "Add driver"}
        </button>
      </div>

      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {showAdd && (
        <form onSubmit={create} className="bg-white rounded-xl border border-slate-200 p-4 grid md:grid-cols-3 gap-3">
          <select
            className="border rounded-lg px-3 py-2"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value, vehicle_id: "" })}
            required
          >
            <option value="">Site *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientLabel(c)}
              </option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2"
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          >
            <option value="">Linked vehicle (optional)</option>
            {vehiclesForSite.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number}
              </option>
            ))}
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Full name *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="WhatsApp mobile"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="border rounded-lg px-3 py-2 font-mono uppercase"
            placeholder="DL number"
            value={form.license_number}
            onChange={(e) => setForm({ ...form, license_number: e.target.value.toUpperCase() })}
          />
          <label className="block text-sm">
            <span className="text-xs font-semibold text-slate-600">DL expiry</span>
            <input
              type="date"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.license_expiry}
              onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
            />
          </label>
          <button type="submit" className="md:col-span-3 bg-btt-navy text-white rounded-lg py-2.5 font-medium">
            Save driver
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="Drivers"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, phone, DL, vehicle…"
          filters={[
            {
              key: "site",
              label: "Site",
              value: siteFilter,
              onChange: setSiteFilter,
              options: siteOptions,
            },
          ]}
          onExport={exportDrivers}
          exportDisabled={!filteredRows.length}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Driver</th>
                <th className="p-3">Phone</th>
                <th className="p-3">DL</th>
                <th className="p-3">Expiry</th>
                <th className="p-3">Site / vehicle</th>
                <th className="p-3">DL doc</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.full_name}</td>
                  <td className="p-3 font-mono text-xs">{r.phone || "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.license_number || "—"}</td>
                  <td className="p-3">{r.license_expiry ? String(r.license_expiry).slice(0, 10) : "—"}</td>
                  <td className="p-3">
                    <div>{r.client_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{r.vehicle_registration || "No vehicle"}</div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-semibold uppercase">{r.license_doc_status || "none"}</span>
                  </td>
                  <td className="p-3">
                    {r.license_doc_status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="text-green-700 font-medium hover:underline" onClick={() => approveLicense(r)}>
                          Approve DL
                        </button>
                        <button type="button" className="text-red-700 font-medium hover:underline" onClick={() => rejectLicense(r)}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500">
                    {rows.length ? "No drivers match your filter." : "No drivers yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
