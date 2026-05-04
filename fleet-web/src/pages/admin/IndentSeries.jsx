import { useEffect, useState } from "react";
import api from "../../api";

export default function IndentSeries() {
  const [managers, setManagers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({
    site_manager_id: "",
    prefix: "CBL",
    start_number: "1",
    end_number: "100",
    digit_width: "",
    description: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");

  async function load() {
    setLoadErr("");
    const [sm, b] = await Promise.all([api.get("/site-managers"), api.get("/admin/indent-batches")]);
    setManagers(sm.data);
    setBatches(b.data);
  }

  useEffect(() => {
    load().catch((ex) => {
      const d = ex.response?.data;
      const hint =
        ex.response?.status === 404
          ? " Is the API updated and running? Try GET /api/admin/indent-batches."
          : "";
      setLoadErr(`${d?.error || d?.message || ex.message || "Could not load page data."}${hint}`);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const body = {
        site_manager_id: Number(form.site_manager_id),
        prefix: form.prefix,
        start_number: parseInt(form.start_number, 10),
        end_number: parseInt(form.end_number, 10),
        description: form.description || null,
      };
      if (form.digit_width) body.digit_width = parseInt(form.digit_width, 10);
      const { data } = await api.post("/admin/indent-batches", body);
      setMsg(
        `Created batch #${data.id}: ${data.serials_created} serials. Example: ${(data.sample || []).join(", ")}`
      );
      load();
    } catch (ex) {
      const d = ex.response?.data;
      setErr(d?.error || ex.message || "Failed");
      if (d?.conflicts?.length) {
        setErr(`${d.error} — ${d.conflicts.slice(0, 5).join(", ")}${d.conflicts.length > 5 ? "…" : ""}`);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Issue indent series</h1>
        {loadErr && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 max-w-2xl">
            {loadErr}
            <span className="block mt-2 text-slate-700">
              If the database was created before this feature, apply{" "}
              <code className="bg-white px-1 rounded">fleet-db/migration_002_indent_serial_batches.sql</code>{" "}
              on <code className="bg-white px-1 rounded">btt_fleet</code>, then restart the API.
            </span>
          </p>
        )}
        <p className="text-slate-600 text-sm mt-1 max-w-2xl">
          Assign a block of serial numbers (e.g. <strong>CBL0001</strong> to <strong>CBL0100</strong>) to one
          supervisor/site manager. They can only use those serials when issuing indents on assigned vehicles.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="bg-white p-6 rounded-xl border border-slate-200 max-w-xl space-y-4 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Site manager *</label>
          <select
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
            value={form.site_manager_id}
            onChange={(e) => setForm({ ...form, site_manager_id: e.target.value })}
            required
          >
            <option value="">Select</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} — {m.client_name} ({m.email})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Prefix *</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 font-mono uppercase"
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              placeholder="CBL"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Digit width (optional)</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.digit_width}
              onChange={(e) => setForm({ ...form, digit_width: e.target.value })}
              placeholder="auto (min 4)"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Start number *</label>
            <input
              type="number"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.start_number}
              onChange={(e) => setForm({ ...form, start_number: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">End number *</label>
            <input
              type="number"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.end_number}
              onChange={(e) => setForm({ ...form, end_number: e.target.value })}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Note (optional)</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Q1 2026 — Plant A"
          />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        <button type="submit" className="bg-btt-navy text-white font-medium py-2.5 px-6 rounded-lg">
          Create series
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <h2 className="font-semibold text-btt-navy p-4 border-b border-slate-100">Issued batches</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Site manager</th>
              <th className="p-3">Range</th>
              <th className="p-3">Available / Used</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3">{b.id}</td>
                <td className="p-3">{b.site_manager_name}</td>
                <td className="p-3 font-mono text-xs">
                  {b.prefix}
                  {String(b.start_number).padStart(b.digit_width, "0")} … {b.prefix}
                  {String(b.end_number).padStart(b.digit_width, "0")}
                </td>
                <td className="p-3">
                  {b.available_count} / {b.consumed_count}
                </td>
                <td className="p-3 text-slate-500">{new Date(b.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
