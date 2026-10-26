import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import { ownershipLabel } from "../../constants/vehicleFields";
import { APPROVAL_STATUS_LABEL } from "../../constants/vehicleDocs";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";
import { clientLabel, isSlaExceeded } from "../../utils/vehicleReg";

export default function AmSites() {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteFilter = searchParams.get("site") || "";

  const [sites, setSites] = useState([]);
  const [siteDetail, setSiteDetail] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [siteManagers, setSiteManagers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  function setSiteFilter(id) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("site", String(id));
    else next.delete("site");
    setSearchParams(next, { replace: true });
  }

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const params = siteFilter ? { client_id: siteFilter } : {};
      const [s, v, sm] = await Promise.all([
        api.get("/am/sites"),
        api.get("/am/vehicles", { params }),
        api.get("/am/site-managers", { params }),
      ]);
      setSites(s.data);
      setVehicles(v.data);
      setSiteManagers(sm.data);

      if (siteFilter) {
        const d = await api.get(`/am/sites/${siteFilter}`);
        setSiteDetail(d.data);
      } else {
        setSiteDetail(null);
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
      setSiteDetail(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteFilter]);

  const filteredSites = useMemo(() => {
    return sites.filter((s) =>
      matchSearch(s, siteSearch, ["name", "site_code", "vendor_type", "address", "site_manager_names"])
    );
  }, [sites, siteSearch]);

  const statusOptions = useMemo(
    () => uniqueOptions(vehicles, "approval_status", { emptyLabel: "All statuses" }),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
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
        "site_manager_names",
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
        { header: "Approved", value: (s) => s.approved_count ?? "" },
        { header: "Pending review", value: (s) => s.pending_count ?? "" },
        { header: "Site managers", value: (s) => s.site_manager_names || "" },
        { header: "SLA max age (yrs)", value: (s) => s.sla_max_age_years ?? "" },
        { header: "Address", value: (s) => s.address || "" },
      ],
    });
  }

  function exportVehicles() {
    downloadExcel({
      filename: `am-vehicles${siteFilter ? `-site-${siteFilter}` : ""}-${excelStamp()}.xlsx`,
      sheetName: "Vehicles",
      rows: filteredVehicles,
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
        { header: "Site managers", value: (v) => v.site_manager_names || "" },
      ],
    });
  }

  function exportSiteManagers() {
    downloadExcel({
      filename: `am-site-managers${siteFilter ? `-site-${siteFilter}` : ""}-${excelStamp()}.xlsx`,
      sheetName: "SiteManagers",
      rows: siteManagers,
      columns: [
        { header: "Name", value: (r) => r.full_name || "" },
        { header: "Email", value: (r) => r.email || "" },
        { header: "Phone", value: (r) => r.phone || "" },
        { header: "Site", value: (r) => r.client_name || "" },
        { header: "Site code", value: (r) => r.site_code || "" },
        { header: "Location", value: (r) => r.location_label || "" },
        { header: "Linked vehicles", value: (r) => r.vehicle_link_count ?? "" },
      ],
    });
  }

  const selectedSite = siteFilter
    ? sites.find((s) => String(s.id) === String(siteFilter)) || siteDetail
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Sites &amp; Vehicles</h1>
          <p className="text-sm text-slate-600 mt-1">
            View-only. Review all assigned sites, or switch to one site to see its site managers and
            vehicles. Export Excel reports anytime.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-wrap items-end gap-3 shadow-sm">
        <label className="block text-sm min-w-[220px] flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Switch site
          </span>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 bg-white text-sm"
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
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            disabled={!sites.length}
            onClick={exportSites}
          >
            Export sites
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            disabled={!siteManagers.length}
            onClick={exportSiteManagers}
          >
            Export site managers
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            disabled={!filteredVehicles.length}
            onClick={exportVehicles}
          >
            Export vehicles
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-700">{err}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!siteFilter && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <ListToolbar
            title="All assigned sites"
            count={filteredSites.length}
            totalCount={sites.length}
            search={siteSearch}
            onSearchChange={setSiteSearch}
            searchPlaceholder="Search sites or site managers…"
            onExport={exportSites}
            exportDisabled={!filteredSites.length}
          />
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Site</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Site managers</th>
                <th className="text-left p-3">Vehicles</th>
                <th className="text-left p-3">Pending</th>
                <th className="text-left p-3">SLA</th>
                <th className="text-left p-3 w-28"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 font-mono">{s.site_code || "—"}</td>
                  <td className="p-3 text-slate-600">
                    {s.site_manager_names || "—"}
                    {s.site_manager_count ? (
                      <div className="text-xs text-slate-400">{s.site_manager_count} manager(s)</div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {s.vehicle_count ?? 0}
                    <span className="text-xs text-slate-500"> · {s.approved_count ?? 0} approved</span>
                  </td>
                  <td className="p-3">{s.pending_count ?? 0}</td>
                  <td className="p-3">{s.sla_max_age_years ? `< ${s.sla_max_age_years} yrs` : "—"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-btt-navy font-medium hover:underline"
                      onClick={() => setSiteFilter(String(s.id))}
                    >
                      Open site
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredSites.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500">
                    {sites.length
                      ? "No sites match your search."
                      : "No sites assigned yet. Ask BTT admin to assign sites to your account."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {siteFilter && selectedSite && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Site detail
              </div>
              <h2 className="text-xl font-bold text-btt-navy">{clientLabel(selectedSite)}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {[selectedSite.vendor_type, selectedSite.address].filter(Boolean).join(" · ") ||
                  "No address on file"}
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-btt-navy hover:underline"
              onClick={() => setSiteFilter("")}
            >
              ← Back to all sites
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="text-xs text-slate-500">Vehicles</div>
              <div className="text-2xl font-bold text-btt-navy">{selectedSite.vehicle_count ?? 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="text-xs text-slate-500">Approved</div>
              <div className="text-2xl font-bold text-green-800">{selectedSite.approved_count ?? 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="text-xs text-slate-500">Pending review</div>
              <div className="text-2xl font-bold text-amber-800">{selectedSite.pending_count ?? 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="text-xs text-slate-500">Site managers</div>
              <div className="text-2xl font-bold text-btt-navy">
                {selectedSite.site_manager_count ?? siteManagers.length}
              </div>
            </div>
          </div>
          {(selectedSite.email || selectedSite.phone) && (
            <p className="text-sm text-slate-600">
              Contact: {[selectedSite.email, selectedSite.phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>
      )}

      {(siteFilter || !siteFilter) && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <ListToolbar
            title={siteFilter ? "Site managers at this site" : "Site managers (all assigned sites)"}
            count={siteManagers.length}
            onExport={exportSiteManagers}
            exportDisabled={!siteManagers.length}
          />
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                {!siteFilter && <th className="text-left p-3">Site</th>}
                <th className="text-left p-3">Linked vehicles</th>
              </tr>
            </thead>
            <tbody>
              {siteManagers.map((sm) => (
                <tr key={sm.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{sm.full_name}</td>
                  <td className="p-3">{sm.email}</td>
                  <td className="p-3">{sm.phone || "—"}</td>
                  {!siteFilter && (
                    <td className="p-3">
                      <button
                        type="button"
                        className="text-btt-navy hover:underline"
                        onClick={() => setSiteFilter(String(sm.client_id))}
                      >
                        {sm.client_name}
                        {sm.site_code ? ` (${sm.site_code})` : ""}
                      </button>
                    </td>
                  )}
                  <td className="p-3">{sm.vehicle_link_count ?? 0}</td>
                </tr>
              ))}
              {!siteManagers.length && (
                <tr>
                  <td colSpan={siteFilter ? 4 : 5} className="p-4 text-slate-500">
                    No site managers for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title={siteFilter ? "Vehicles at this site" : "Vehicles (all assigned sites)"}
          count={filteredVehicles.length}
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
                o.value ? { ...o, label: APPROVAL_STATUS_LABEL[o.value] || o.label } : o
              ),
            },
          ]}
          onExport={exportVehicles}
          exportDisabled={!filteredVehicles.length}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Reg</th>
                <th className="text-left p-3">Serial</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Ownership</th>
                <th className="text-left p-3">Status</th>
                {!siteFilter && <th className="text-left p-3">Site</th>}
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Site manager</th>
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
                    {APPROVAL_STATUS_LABEL[v.approval_status] || v.approval_status || "—"}
                  </td>
                  {!siteFilter && (
                    <td className="p-3">
                      <button
                        type="button"
                        className="text-btt-navy hover:underline text-left"
                        onClick={() => setSiteFilter(String(v.client_id))}
                      >
                        {v.client_name}
                        {v.site_code ? ` (${v.site_code})` : ""}
                      </button>
                    </td>
                  )}
                  <td className="p-3">{v.owner_name || "—"}</td>
                  <td className="p-3 text-slate-600">{v.site_manager_names || "—"}</td>
                </tr>
              ))}
              {!filteredVehicles.length && (
                <tr>
                  <td colSpan={siteFilter ? 7 : 8} className="p-4 text-slate-500">
                    No vehicles for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
