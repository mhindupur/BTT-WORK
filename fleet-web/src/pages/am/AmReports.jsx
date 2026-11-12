import { useEffect, useState } from "react";
import api from "../../api";
import { ownershipLabel } from "../../constants/vehicleFields";
import { APPROVAL_STATUS_LABEL } from "../../constants/vehicleDocs";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";

export default function AmReports() {
  const [sites, setSites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [siteManagers, setSiteManagers] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setErr("");
    try {
      const [s, v, sm] = await Promise.all([
        api.get("/am/sites"),
        api.get("/am/vehicles"),
        api.get("/am/site-managers"),
      ]);
      setSites(s.data);
      setVehicles(v.data);
      setSiteManagers(sm.data);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function run(label, fn) {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy("");
    }
  }

  const reports = [
    {
      key: "sites",
      title: "Sites summary",
      desc: "All sites assigned to you — codes, managers, vehicle counts, SLA.",
      count: sites.length,
      onExport: () =>
        run("sites", async () => {
          downloadExcel({
            filename: `am-report-sites-${excelStamp()}.xlsx`,
            sheetName: "Sites",
            rows: sites,
            columns: [
              { header: "Site", value: (s) => s.name || "" },
              { header: "Code", value: (s) => s.site_code || "" },
              { header: "Vendor", value: (s) => s.vendor_type || "" },
              { header: "Site managers", value: (s) => s.site_manager_names || "" },
              { header: "Vehicles", value: (s) => s.vehicle_count ?? "" },
              { header: "Approved", value: (s) => s.approved_count ?? "" },
              { header: "Pending", value: (s) => s.pending_count ?? "" },
              { header: "SLA max age (yrs)", value: (s) => s.sla_max_age_years ?? "" },
              { header: "Address", value: (s) => s.address || "" },
            ],
          });
        }),
    },
    {
      key: "managers",
      title: "Site managers",
      desc: "Site managers who report under your assigned sites.",
      count: siteManagers.length,
      onExport: () =>
        run("managers", async () => {
          downloadExcel({
            filename: `am-report-site-managers-${excelStamp()}.xlsx`,
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
        }),
    },
    {
      key: "vehicles",
      title: "Vehicles (all sites)",
      desc: "Full vehicle register across every site assigned to you.",
      count: vehicles.length,
      onExport: () =>
        run("vehicles", async () => {
          downloadExcel({
            filename: `am-report-vehicles-${excelStamp()}.xlsx`,
            sheetName: "Vehicles",
            rows: vehicles,
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
              { header: "Owner phone", value: (v) => v.owner_phone || "" },
              { header: "Site managers", value: (v) => v.site_manager_names || "" },
            ],
          });
        }),
    },
    {
      key: "pending",
      title: "Pending review vehicles",
      desc: "Vehicles waiting on BTT admin approval across your sites.",
      count: vehicles.filter((v) => v.approval_status === "pending_review").length,
      onExport: () =>
        run("pending", async () => {
          const rows = vehicles.filter((v) => v.approval_status === "pending_review");
          downloadExcel({
            filename: `am-report-pending-vehicles-${excelStamp()}.xlsx`,
            sheetName: "PendingReview",
            rows,
            columns: [
              { header: "Registration", value: (v) => v.registration_number || "" },
              { header: "Site", value: (v) => v.client_name || "" },
              { header: "Site code", value: (v) => v.site_code || "" },
              { header: "Owner", value: (v) => v.owner_name || "" },
              { header: "Site managers", value: (v) => v.site_manager_names || "" },
            ],
          });
        }),
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Reports</h1>
        <p className="text-sm text-slate-600 mt-1">
          Download Excel reports for your assigned sites. Data is view-only.
        </p>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}

      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.key}
            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-semibold text-btt-navy">{r.title}</div>
              <p className="text-sm text-slate-600 mt-0.5">{r.desc}</p>
              <p className="text-xs text-slate-500 mt-1">{r.count} row(s)</p>
            </div>
            <button
              type="button"
              disabled={!r.count || busy === r.key}
              onClick={r.onExport}
              className="shrink-0 rounded-lg bg-btt-navy text-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {busy === r.key ? "Exporting…" : "Export Excel"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
