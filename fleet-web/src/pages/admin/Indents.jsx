import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminIndents() {
  const [rows, setRows] = useState([]);

  async function load() {
    const { data } = await api.get("/admin/indents");
    setRows(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function setStatus(id, status) {
    await api.patch(`/admin/indents/${id}/status`, { status });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Indents</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Serial</th>
              <th className="text-left p-3">Vehicle</th>
              <th className="text-left p-3">Site mgr</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{i.serial_number}</td>
                <td className="p-3">{i.registration_number}</td>
                <td className="p-3">{i.site_manager_name}</td>
                <td className="p-3">₹{i.amount_rs}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3 space-x-2">
                  {i.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="text-green-700 hover:underline"
                        onClick={() => setStatus(i.id, "utilized")}
                      >
                        Mark utilized
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 hover:underline"
                        onClick={() => setStatus(i.id, "cancelled")}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
