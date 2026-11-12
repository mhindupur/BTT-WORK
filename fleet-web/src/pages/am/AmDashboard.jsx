import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { clientLabel } from "../../utils/vehicleReg";

export default function AmDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/am/dashboard")
      .then((r) => setStats(r.data))
      .catch(console.error);
  }, []);

  const cards = [
    { label: "Assigned sites", value: stats?.sites ?? "—", to: "/am/sites" },
    { label: "Site managers", value: stats?.site_managers ?? "—", to: "/am/sites" },
    { label: "Vehicles", value: stats?.vehicles ?? "—", to: "/am/sites" },
    { label: "Pending review", value: stats?.pending_review ?? "—", to: "/am/sites" },
    { label: "Over SLA age", value: stats?.sla_exceeded ?? "—", to: "/am/sites" },
  ];

  const preview = stats?.sites_preview || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Account manager overview</h1>
        <p className="text-sm text-slate-600 mt-1">
          View-only access. Site managers at your assigned sites report under you — open a site to
          review details, or download Excel reports.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-btt-navy/40 transition"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
            <div className="text-3xl font-bold text-btt-navy mt-2">{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/am/sites"
          className="rounded-lg bg-btt-navy text-white px-4 py-2.5 text-sm font-semibold"
        >
          Browse sites &amp; vehicles
        </Link>
        <Link
          to="/am/reports"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          Download reports
        </Link>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-btt-navy text-sm">
          Your sites
        </div>
        <ul className="divide-y">
          {preview.map((s) => (
            <li key={s.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-btt-navy">{clientLabel(s)}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {s.site_manager_count ?? 0} site manager(s)
                  {s.site_manager_names ? ` · ${s.site_manager_names}` : ""} ·{" "}
                  {s.vehicle_count ?? 0} vehicle(s)
                </div>
              </div>
              <Link
                to={`/am/sites?site=${s.id}`}
                className="text-sm font-semibold text-btt-navy hover:underline"
              >
                Open site
              </Link>
            </li>
          ))}
          {!preview.length && (
            <li className="px-4 py-6 text-sm text-slate-500">
              No sites assigned yet. Ask BTT admin to create your account manager profile and assign
              sites under <strong>Admin → Account Managers</strong>.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
