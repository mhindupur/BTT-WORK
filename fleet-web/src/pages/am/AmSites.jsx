import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import { ownershipLabel } from "../../constants/vehicleFields";
import { APPROVAL_STATUS_LABEL } from "../../constants/vehicleDocs";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";
import { clientLabel, isSlaExceeded } from "../../utils/vehicleReg";

export default function AmSites() {
  const [sites, setSites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [siteFilter, setSiteFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
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

  const filteredSites = useMemo(() => {
    const base = siteFilter ? sites.filter((s) => String(s.id) === String(siteFilter)) : sites;
    return base.filter((s) =>
      matchSearch(s, siteSearch, ["name", "site_code", "vendor_type", "address"])
    );
  }, [sites, siteFilter, siteSearch]);

  const statusOptions = useMemo(
    () => uniqueOptions(vehicles, "approval_status", { emptyLabel: "All statuses" }),
    [vehicles]
  );

  const filtered = useMemo(() => {
    return vehicles.filter((r) => {
      if (statusFilter && r.approval_status !== statusFilter) return false;
      return matchSearch(r, search, [
        "registration_number",
        "vehicle_serial",
        "client_name",
        "site_code",
        "owner_name",
        "vehicle_type_name",
        "approval_status",
      ]);
    });
  }, [vehicles, search, statusFilter]);

  function exportSites() {
    downloadExcel({
      filename: `am-sites-${excelStamp()}.xlsx`,
      sheetName: "Sites",
      rows: filteredSites,
      columns: [
        { header: "Site", value: (s) => s.name || "" },
        { header: "Code", value: (s) => s.site_code || "" },
        { header: "Vendor", value: (s) => s.vendor_type || "" },
        { header: "Vehicles", value: (s) => s.vehicle_count ?? "" },
        { header: "Site managers", value: (s) => s.site_manager_count ?? "" },
        { header: "SLA max age (yrs)", value: (s) => s.sla_max_age_years ?? "" },
      ],
    });
  }

  function exportVehicles() {
    downloadExcel({
      filename: `am-vehicles-${excelStamp()}.xlsx`,
      sheetName: "Vehicles",
      rows: filtered,
      columns: [
        { header: "Registration", value: (v) => v.registration_number || "" },
        { header: "Serial", value: (v) => v.vehicle_serial || "" },
        { header: "Type", value: (v) => v.vehicle_type_name || v.make_model || "" },
        { header: "Ownership", value: (v) => ownershipLabel(v.ownership) },
        {
          header: "Status",
          value: (v) => APPROVAL_STATUS_LABEL[v.approval_status] || v.approval_status || "",
        },
        { header: "Site", value: (v) => v.client_name || "" },
        { header: "Site code", value: (v) => v.site_code || "" },
        { header: "Owner", value: (v) => v.owner_name || "" },
      ],
    });
  }

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
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="Sites"
          count={filteredSites.length}
          totalCount={sites.length}
          search={siteSearch}
          onSearchChange={setSiteSearch}
          searchPlaceholder="Search sites…"
          onExport={exportSites}
          exportDisabled={!filteredSites.length}
        />
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
            {filteredSites.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 font-mono">{s.site_code || "—"}</td>
                <td className="p-3">{s.vendor_type || "—"}</td>
                <td className="p-3">{s.vehicle_count ?? "—"}</td>
                <td className="p-3">{s.site_manager_count ?? "—"}</td>
                <td className="p-3">{s.sla_max_age_years ? `< ${s.sla_max_age_years} yrs` : "—"}</td>
              </tr>
            ))}
            {!filteredSites.length && (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">
                  {sites.length
                    ? "No sites match your search."
                    : "No sites assigned to your account yet. Ask BTT admin to assign sites."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="Vehicles"
          count={filtered.length}
          totalCount={vehicles.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search vehicles…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: statusOptions.map((o) =>
                o.value
                  ? { ...o, label: APPROVAL_STATUS_LABEL[o.value] || o.label }
                  : o
              ),
            },
          ]}
          onExport={exportVehicles}
          exportDisabled={!filtered.length}
        />
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
                <td className="p-3">
                  {APPROVAL_STATUS_LABEL[v.approval_status] || v.approval_status || "—"}
                </td>
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
