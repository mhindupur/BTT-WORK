import { useEffect, useState } from "react";
import api from "../../api";

export default function MyIndents() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/sm/indents/mine").then((r) => setRows(r.data)).catch(console.error);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-btt-navy mb-3 sm:mb-4">My indents</h1>

      {/* Mobile: cards */}
      <ul className="sm:hidden space-y-3">
        {rows.map((i) => (
          <li
            key={i.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2 text-sm"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="font-mono text-xs font-semibold text-btt-navy break-all">{i.serial_number}</span>
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {i.status}
              </span>
            </div>
            <div className="text-slate-700">
              <span className="text-slate-500">Vehicle</span>{" "}
              <span className="font-medium">{i.registration_number}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>₹{i.amount_rs}</span>
              <span className="text-xs text-slate-500">{new Date(i.created_at).toLocaleString()}</span>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-slate-500 text-sm text-center py-8">No indents yet.</li>
        )}
      </ul>

      {/* sm+: table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Serial</th>
              <th className="text-left p-3">Vehicle</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{i.serial_number}</td>
                <td className="p-3">{i.registration_number}</td>
                <td className="p-3">₹{i.amount_rs}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(i.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
