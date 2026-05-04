import { useEffect, useState } from "react";
import api from "../../api";

export default function MyIndents() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/sm/indents/mine").then((r) => setRows(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">My indents</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
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
                <td className="p-3 text-slate-500">{new Date(i.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
