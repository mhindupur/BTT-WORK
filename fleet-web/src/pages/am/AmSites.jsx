import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { ownershipLabel } from "../../constants/vehicleFields";
import { clientLabel, isSlaExceeded } from "../../utils/vehicleReg";

export default function AmSites() {
  const [sites, setSites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [siteFilter, setSiteFilter] = useState("");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  async function load(clientId) {
    setErr("");
    try {
      const [s, v] = await Promise.all([
        api.get("/am/sites"),
        api.get("/am/vehicles", { params: clientId ? { client_id: clientId } : {} }),
      ]);
      setSites(s.data);
      setVehicles(v.data);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  useEffect(() => {
    load(siteFilter).catch(console.error);
  }, [siteFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((r) =>
      [r.registration_number, r.vehicle_serial, r.client_name, r.site_code, r.owner_name, r.vehicle_type_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Sites &amp; Vehicles</h1>
        <p className="text-sm text-slate-600 mt-1">View-only. Filter by site to focus one location.</p>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="border rounded-lg px-3 py-2 bg-white text-sm"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
        >
          <option value="">All assigned sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {clientLabel(s)}
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

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-btt-navy text-sm">Sites</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Site</th>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Vendor</th>
              <th className="text-left p-3">Vehicles</th>
              <th className="text-left p-3">Site managers</th>
              <th className="text-left p-3">SLA</th>
            </tr>
          </thead>
          <tbody>
            {(siteFilter ? sites.filter((s) => String(s.id) === String(siteFilter)) : sites).map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 font-mono">{s.site_code || "—"}</td>
                <td className="p-3">{s.vendor_type || "—"}</td>
                <td className="p-3">{s.vehicle_count ?? "—"}</td>
                <td className="p-3">{s.site_manager_count ?? "—"}</td>
                <td className="p-3">{s.sla_max_age_years ? `< ${s.sla_max_age_years} yrs` : "—"}</td>
              </tr>
            ))}
            {!sites.length && (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">
                  No sites assigned to your account yet. Ask BTT admin to assign sites.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-btt-navy text-sm">Vehicles</div>
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.id}
                className={`border-t border-slate-100 ${isSlaExceeded(v) ? "bg-orange-50" : ""}`}
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
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="p-4 text-slate-500">
                  No vehicles for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
