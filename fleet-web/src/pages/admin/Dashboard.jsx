import { useEffect, useState } from "react";
import api from "../../api";

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
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-btt-navy">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Total Clients", t.clients],
          ["Vehicles", t.vehicles],
          ["Pending Indents", t.active_indents_pending],
          ["Fuel recon alerts", t.fuel_recon_alerts],
        ].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-btt-navy">{val}</div>
            <div className="text-sm text-slate-600">{label}</div>
          </div>
        ))}
      </div>
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
