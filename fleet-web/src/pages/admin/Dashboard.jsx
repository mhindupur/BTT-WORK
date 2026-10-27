import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import CompareBars from "../../components/CompareBars";
import DonutChart from "../../components/DonutChart";

function StatCard({ label, value, hint, to }) {
  const body = (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full hover:border-btt-accent/40 transition-colors">
      <div className="text-3xl font-bold tabular-nums text-btt-navy">{value}</div>
      <div className="text-sm font-semibold text-slate-800 mt-1.5 leading-snug">{label}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/admin/dashboard/summary")
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading dashboard…</p>;

  const t = data.totals;
  const charts = data.charts || {};

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-btt-navy text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/70">Fleet overview</div>
          <h1 className="text-xl font-bold">Dashboard — Basaveshwara Tours &amp; Travels</h1>
        </div>
        <div className="text-xs text-white/80">Main fleet parameters</div>
      </div>

      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Key parameters</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatCard
            label="Total fleet (vehicles)"
            value={t.vehicles}
            hint="All vehicle records"
            to="/admin/vehicles"
          />
          <StatCard
            label="Total fleet (distinct)"
            value={t.unique_vehicles}
            hint="Distinct registration numbers"
            to="/admin/vehicles"
          />
          <StatCard label="Total sites" value={t.clients} hint="Client / site locations" to="/admin/clients" />
          <StatCard
            label="Site incharge & managers"
            value={t.site_managers}
            hint="Site managers linked to sites"
            to="/admin/clients"
          />
          <StatCard
            label="Total GPS devices"
            value={t.gps_devices}
            hint="Vehicles with GPS = Yes"
            to="/admin/vehicles"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Analytics</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <CompareBars title="Sites — single vs multiple vendors" segments={charts.by_vendor_type || []} />
          <DonutChart title="Vehicles by type" segments={charts.by_model || []} />
          <DonutChart title="Vehicles by fuel used" segments={charts.by_fuel || []} />
          <DonutChart title="GPS device vendors" segments={charts.by_gps_vendor || []} />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Approval, document expiry, indents, and fuel mismatch views are on their respective tabs:{" "}
          <Link className="text-btt-navy font-medium underline" to="/admin/vehicle-approvals">
            Vehicle approvals
          </Link>
          ,{" "}
          <Link className="text-btt-navy font-medium underline" to="/admin/vehicles">
            Vehicles
          </Link>
          ,{" "}
          <Link className="text-btt-navy font-medium underline" to="/admin/indents">
            Indents
          </Link>
          ,{" "}
          <Link className="text-btt-navy font-medium underline" to="/admin/fuel">
            Fuel Recon
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
