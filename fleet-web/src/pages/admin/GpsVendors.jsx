import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import ListToolbar from "../../components/ListToolbar";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { matchSearch } from "../../utils/listFilter";

export default function AdminGpsVendors() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  async function load() {
    const { data } = await api.get("/gps-vendors", { params: { all: 1 } });
    setRows(data);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (activeFilter === "active" && !r.is_active) return false;
      if (activeFilter === "disabled" && r.is_active) return false;
      return matchSearch(r, search, ["name", "code"]);
    });
  }, [rows, search, activeFilter]);

  function exportVendors() {
    downloadExcel({
      filename: `gps-vendors-${excelStamp()}.xlsx`,
      sheetName: "GpsVendors",
      rows: filteredRows,
      columns: [
        { header: "Name", value: (r) => r.name || "" },
        { header: "Code", value: (r) => r.code || "" },
        { header: "Status", value: (r) => (r.is_active ? "Active" : "Disabled") },
      ],
    });
  }

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/gps-vendors", { name, code: code || null });
      setName("");
      setCode("");
      setMsg("GPS vendor added.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function toggleActive(row) {
    setErr("");
    try {
      await api.patch(`/gps-vendors/${row.id}`, { is_active: !row.is_active });
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function rename(row) {
    const next = window.prompt("GPS vendor name", row.name);
    if (!next || !next.trim() || next.trim() === row.name) return;
    setErr("");
    try {
      await api.patch(`/gps-vendors/${row.id}`, { name: next.trim() });
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function remove(row) {
    if (!window.confirm(`Remove or disable "${row.name}"?`)) return;
    setErr("");
    setMsg("");
    try {
      const { data, status } = await api.delete(`/gps-vendors/${row.id}`);
      if (status === 200 && data?.soft_disabled) {
        setMsg(`"${row.name}" is used by vehicles — disabled instead of deleted.`);
      }
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">GPS vendors</h1>
        <p className="text-sm text-slate-600 mt-1">
          Master list of GPS types. When GPS is Yes on a vehicle form, these appear in the GPS type dropdown.
        </p>
      </div>
      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      <form onSubmit={create} className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-3">
        <input
          className="border rounded-lg px-3 py-2 sm:col-span-2"
          placeholder="New GPS vendor * (e.g. MapMyIndia)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button type="submit" className="sm:col-span-3 bg-btt-navy text-white rounded-lg py-2.5 font-medium">
          Add GPS vendor
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ListToolbar
          title="GPS vendors"
          count={filteredRows.length}
          totalCount={rows.length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name or code…"
          filters={[
            {
              key: "active",
              label: "Status",
              value: activeFilter,
              onChange: setActiveFilter,
              options: [
                { value: "", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
              ],
            },
          ]}
          onExport={exportVendors}
          exportDisabled={!filteredRows.length}
        />
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Code</th>
              <th className="p-3">Status</th>
              <th className="p-3 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className={`border-t ${r.is_active ? "" : "bg-slate-50 text-slate-500"}`}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 font-mono text-xs">{r.code || "—"}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      r.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {r.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="text-btt-navy font-medium hover:underline" onClick={() => rename(r)}>
                      Rename
                    </button>
                    <button type="button" className="text-slate-700 font-medium hover:underline" onClick={() => toggleActive(r)}>
                      {r.is_active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="text-red-700 font-medium hover:underline" onClick={() => remove(r)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  {rows.length ? "No vendors match your filter." : "No vendors yet — defaults will appear after first load."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
