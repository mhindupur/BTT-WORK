import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

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
    { label: "Vehicles", value: stats?.vehicles ?? "—", to: "/am/sites" },
    { label: "Pending review", value: stats?.pending_review ?? "—", to: "/am/sites" },
    { label: "Over SLA age", value: stats?.sla_exceeded ?? "—", to: "/am/sites" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-2">Account manager overview</h1>
      <p className="text-sm text-slate-600 mb-6">
        You can view information for sites BTT assigned to you. Editing is not available in this role.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
