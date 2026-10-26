import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch, uniqueOptions } from "../../utils/listFilter";

export default function AdminIndents() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
        "site_manager_name",
        "status",
        (row) => String(row.amount_rs ?? ""),
      ]);
    });
  }, [rows, search, statusFilter]);

  function exportIndents() {
    downloadExcel({
      filename: `indents-${excelStamp()}.xlsx`,
      sheetName: "Indents",
      rows: filteredRows,
      columns: [
        { header: "Serial", value: (r) => r.serial_number || "" },
        { header: "Vehicle", value: (r) => r.registration_number || "" },
        { header: "Site manager", value: (r) => r.site_manager_name || "" },
        { header: "Amount (Rs)", value: (r) => r.amount_rs ?? "" },
        { header: "Status", value: (r) => r.status || "" },
        {
          header: "Created",
          value: (r) => (r.created_at ? String(r.created_at).replace("T", " ").slice(0, 19) : ""),
        },
      ],
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-btt-navy mb-4">Indents</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="All indents"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search serial, vehicle, site manager…"
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
        <div className="overflow-x-auto">
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
              {filteredRows.map((i) => (
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
              {!filteredRows.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-500">
                    {rows.length ? "No indents match your filter." : "No indents yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
