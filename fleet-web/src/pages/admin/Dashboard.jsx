import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import DonutChart from "../../components/DonutChart";

function StatCard({ label, value, hint, tone = "default", to }) {
  const tones = {
    default: "text-btt-navy",
    danger: "text-red-600",
    warn: "text-amber-700",
    ok: "text-green-700",
  };
  const body = (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm h-full hover:border-btt-accent/40 transition-colors">
      <div className={`text-2xl font-bold tabular-nums ${tones[tone] || tones.default}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-800 mt-1 leading-snug">{label}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const APPROVAL_LABEL = {
  approved: "Approved",
  pending_review: "Pending review",
  draft: "Draft",
  rejected: "Rejected",
};

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
  const expiry = data.expiry || {};
  const charts = data.charts || {};

  const approvalSegments = (charts.by_approval || []).map((s) => ({
    ...s,
    label: APPROVAL_LABEL[s.label] || s.label,
    color:
      s.label === "approved"
        ? "#16a34a"
        : s.label === "pending_review"
          ? "#d97706"
          : s.label === "rejected"
            ? "#dc2626"
            : "#64748b",
  }));

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-btt-navy text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/70">Fleet records &amp; compliance</div>
          <h1 className="text-xl font-bold">Fleet Analytics Dashboard — Basaveshwara Tours &amp; Travels</h1>
        </div>
        <div className="text-xs text-white/80">Login: Administrator</div>
      </div>

      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatCard label="Total vehicles" value={t.vehicles} hint="All fleet records" to="/admin/vehicles" />
          <StatCard label="Unique vehicles" value={t.unique_vehicles} hint="Distinct registration numbers" />
          <StatCard label="Active approved" value={t.active_approved} tone="ok" hint="Ready for work" />
          <StatCard
            label="Pending review"
            value={t.pending_review}
            tone="warn"
            hint="Click to review"
            to="/admin/vehicle-approvals"
          />
          <StatCard label="Clients / sites" value={t.clients} hint={`${t.site_managers} site managers`} to="/admin/clients" />
          <StatCard
            label="Insurance expired"
            value={t.insurance_expired}
            tone={t.insurance_expired ? "danger" : "ok"}
            hint="On approved vehicles"
          />
          <StatCard
            label="Fitness expired"
            value={t.fitness_expired}
            tone={t.fitness_expired ? "danger" : "ok"}
          />
          <StatCard label="Road tax expired" value={t.tax_expired} tone={t.tax_expired ? "danger" : "ok"} />
          <StatCard label="PUC expired" value={t.puc_expired} tone={t.puc_expired ? "danger" : "ok"} />
          <StatCard label="Permit expired" value={t.permit_expired} tone={t.permit_expired ? "danger" : "ok"} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Fleet analytics</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <DonutChart title="Approval status" segments={approvalSegments} />
          <DonutChart title="Vehicle types" segments={charts.by_model || []} />
          <DonutChart title="Fuel types" segments={charts.by_fuel || []} />
          <DonutChart title="Vehicles by client / site" segments={charts.by_client || []} />
          <DonutChart
            title="Pending indents vs alerts"
            segments={[
              { label: "Pending indents", value: t.active_indents_pending, color: "#d97706" },
              { label: "Fuel recon alerts", value: t.fuel_recon_alerts, color: "#dc2626" },
              {
                label: "Healthy ops",
                value: Math.max(0, t.active_approved - t.active_indents_pending),
                color: "#16a34a",
              },
            ]}
          />
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-btt-navy mb-3">Vehicles waiting for approval</h3>
            <ul className="space-y-2 text-sm">
              {(data.pending_vehicles || []).length === 0 && (
                <li className="text-slate-500">No vehicles pending review.</li>
              )}
              {(data.pending_vehicles || []).map((v) => (
                <li key={v.id} className="flex justify-between gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <div className="font-mono font-semibold text-btt-navy">{v.registration_number}</div>
                    <div className="text-xs text-slate-600">
                      {v.submitted_by_name || "—"} · {v.client_name}
                    </div>
                  </div>
                  <Link to="/admin/vehicle-approvals" className="text-xs font-semibold text-btt-accent self-center">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Document expiry status (approved active vehicles)
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            ["Insurance", expiry.insurance],
            ["Fitness certificate", expiry.fitness],
            ["Road tax", expiry.road_tax],
            ["PUC certificate", expiry.puc],
            ["Permit", expiry.permit],
          ].map(([title, bucket]) => (
            <DonutChart
              key={title}
              title={title}
              segments={[
                { label: "Valid", value: bucket?.valid || 0, color: "#16a34a" },
                { label: "Expired", value: bucket?.expired || 0, color: "#ea580c" },
                { label: "Date missing", value: bucket?.missing || 0, color: "#94a3b8" },
              ]}
            />
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-semibold text-btt-navy mb-3">Recent indents</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2">Serial</th>
                <th className="pb-2">Vehicle</th>
                <th className="pb-2">SM</th>
                <th className="pb-2">Amt</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_indents?.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="py-2 font-mono text-xs">{i.serial_number}</td>
                  <td>{i.registration_number}</td>
                  <td>{i.site_manager_name}</td>
                  <td>₹{i.amount_rs}</td>
                  <td>
                    <span
                      className={
                        i.status === "pending"
                          ? "text-amber-600"
                          : i.status === "utilized"
                            ? "text-green-600"
                            : "text-slate-500"
                      }
                    >
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-semibold text-amber-800 mb-3">Mismatch alerts</h2>
          <ul className="text-sm space-y-2">
            {data.mismatch_alerts?.length ? (
              data.mismatch_alerts.map((m) => (
                <li key={m.id} className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                  {m.alert_message}
                </li>
              ))
            ) : (
              <li className="text-slate-500">No recent mismatches.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
