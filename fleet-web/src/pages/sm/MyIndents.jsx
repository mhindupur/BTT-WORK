import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";

export default function MyIndents() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.get("/sm/indents/mine").then((r) => setRows(r.data)).catch(console.error);
  }, []);

  const statusOptions = useMemo(
    () => uniqueOptions(rows, "status", { emptyLabel: "All statuses" }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      return matchSearch(r, search, [
        "serial_number",
        "registration_number",
        "status",
        (row) => String(row.amount_rs ?? ""),
      ]);
    });
  }, [rows, search, statusFilter]);

  function exportIndents() {
    downloadExcel({
      filename: `my-indents-${excelStamp()}.xlsx`,
      sheetName: "MyIndents",
      rows: filteredRows,
      columns: [
        { header: "Serial", value: (r) => r.serial_number || "" },
        { header: "Vehicle", value: (r) => r.registration_number || "" },
        { header: "Amount (Rs)", value: (r) => r.amount_rs ?? "" },
        { header: "Status", value: (r) => r.status || "" },
        {
          header: "Created",
          value: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : ""),
        },
      ],
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-btt-navy mb-3 sm:mb-4">My indents</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-3">
        <ListToolbar
          title="Indents"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search serial, vehicle…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: statusOptions,
            },
          ]}
          onExport={exportIndents}
          exportDisabled={!filteredRows.length}
        />
      </div>

      {/* Mobile: cards */}
      <ul className="sm:hidden space-y-3">
        {filteredRows.map((i) => (
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
        {filteredRows.length === 0 && (
          <li className="text-slate-500 text-sm text-center py-8">
            {rows.length ? "No indents match your filter." : "No indents yet."}
          </li>
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
            {filteredRows.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{i.serial_number}</td>
                <td className="p-3">{i.registration_number}</td>
                <td className="p-3">₹{i.amount_rs}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(i.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={5} className="p-4 text-slate-500">
                  {rows.length ? "No indents match your filter." : "No indents yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
