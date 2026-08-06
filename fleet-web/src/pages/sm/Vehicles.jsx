import { useEffect, useState } from "react";
import api from "../../api";

const DOC_TYPES = ["RC", "INS", "FC", "PUC", "TAX", "PERMIT", "VP", "OTHER"];
const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-900",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
const emptyForm = {
  registration_number: "",
  owner_name: "",
  owner_phone: "",
  make_model: "",
  fuel_type: "",
  insurance_expiry: "",
  fitness_expiry: "",
  puc_expiry: "",
  tax_expiry: "",
  permit_expiry: "",
  notes: "",
};

export default function SmVehicles() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState("RC");
  const [docExpiry, setDocExpiry] = useState("");
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await api.get("/sm/vehicles/mine");
    setRows(data);
  }
  async function loadDocs(id) {
    if (!id) return setDocs([]);
    const { data } = await api.get(`/sm/vehicles/${id}/documents`);
    setDocs(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);
  useEffect(() => {
    loadDocs(selectedId).catch(console.error);
  }, [selectedId]);

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const { data } = await api.post("/sm/vehicles", form);
      setMsg(`Vehicle ${data.registration_number} saved as draft. Upload documents, then submit for admin approval.`);
      setForm(emptyForm);
      setSelectedId(data.id);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function uploadDoc(e) {
    e.preventDefault();
    if (!selectedId) return setErr("Select a vehicle first");
    if (!file) return setErr("Choose a document file");
    setErr("");
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    if (docExpiry) fd.append("expiry_date", docExpiry);
    try {
      await api.post(`/sm/vehicles/${selectedId}/documents`, fd);
      setFile(null);
      setDocExpiry("");
      setMsg("Document uploaded.");
      await loadDocs(selectedId);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function submitForApproval() {
    if (!selectedId) return;
    setErr("");
    setMsg("");
    try {
      await api.post(`/sm/vehicles/${selectedId}/submit`);
      setMsg("Submitted to BTT admin. You cannot issue indents until approved.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  const selected = rows.find((r) => Number(r.id) === Number(selectedId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Vehicles &amp; documents</h1>
        <p className="text-sm text-slate-600 mt-1">
          Add vehicle details and supporting documents. After submit, BTT admin must approve before you can issue
          indents / assign work.
        </p>
      </div>
      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      <form onSubmit={create} className="bg-white rounded-xl border border-slate-200 p-4 grid md:grid-cols-2 gap-3">
        <h2 className="md:col-span-2 font-semibold text-btt-navy">Add vehicle</h2>
        <input className="border rounded-lg px-3 py-2" placeholder="Registration *" value={form.registration_number}
          onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required />
        <input className="border rounded-lg px-3 py-2" placeholder="Owner name" value={form.owner_name}
          onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
        <input className="border rounded-lg px-3 py-2" placeholder="Owner phone" value={form.owner_phone}
          onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} />
        <input className="border rounded-lg px-3 py-2" placeholder="Model (SUV / Sedan)" value={form.make_model}
          onChange={(e) => setForm({ ...form, make_model: e.target.value })} />
        <select className="border rounded-lg px-3 py-2" value={form.fuel_type}
          onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
          <option value="">Fuel type</option>
          <option value="DIE">Diesel</option>
          <option value="PET">Petrol</option>
          <option value="CNG">CNG</option>
          <option value="ELE">Electric</option>
        </select>
        <label className="text-xs text-slate-600">Insurance expiry
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={form.insurance_expiry}
            onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} />
        </label>
        <label className="text-xs text-slate-600">Fitness (FC) expiry
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={form.fitness_expiry}
            onChange={(e) => setForm({ ...form, fitness_expiry: e.target.value })} />
        </label>
        <label className="text-xs text-slate-600">PUC expiry
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={form.puc_expiry}
            onChange={(e) => setForm({ ...form, puc_expiry: e.target.value })} />
        </label>
        <label className="text-xs text-slate-600">Tax expiry
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={form.tax_expiry}
            onChange={(e) => setForm({ ...form, tax_expiry: e.target.value })} />
        </label>
        <label className="text-xs text-slate-600">Permit (42/47) expiry
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={form.permit_expiry}
            onChange={(e) => setForm({ ...form, permit_expiry: e.target.value })} />
        </label>
        <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Notes" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" className="md:col-span-2 bg-btt-navy text-white rounded-lg py-2.5 font-medium">
          Save draft
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-3 border-b font-semibold text-btt-navy">My vehicles</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Reg No</th>
                <th className="p-3">Status</th>
                <th className="p-3">Docs</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t ${Number(selectedId) === Number(r.id) ? "bg-amber-50/50" : ""}`}>
                  <td className="p-3 font-medium">{r.registration_number}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[r.approval_status] || ""}`}>
                      {r.approval_status}
                    </span>
                    {r.rejection_note ? <div className="text-xs text-red-700 mt-1">{r.rejection_note}</div> : null}
                  </td>
                  <td className="p-3">{r.doc_count ?? "—"}</td>
                  <td className="p-3">
                    <button type="button" className="text-btt-accent font-medium hover:underline"
                      onClick={() => setSelectedId(r.id)}>Manage docs</button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={4} className="p-4 text-slate-500">No vehicles yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-btt-navy">
              Documents — {selected.registration_number}{" "}
              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${STATUS_BADGE[selected.approval_status]}`}>
                {selected.approval_status}
              </span>
            </h2>
            {["draft", "rejected"].includes(selected.approval_status) && (
              <button type="button" onClick={submitForApproval}
                className="bg-btt-accent text-white px-4 py-2 rounded-lg text-sm font-medium">
                Submit for admin approval
              </button>
            )}
          </div>
          {["draft", "rejected", "pending_review"].includes(selected.approval_status) && (
            <form onSubmit={uploadDoc} className="grid md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs text-slate-600">Doc type</label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2" value={docType}
                  onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Expiry (optional)</label>
                <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2" value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-600">File</label>
                <input type="file" accept="image/*,.pdf" className="mt-1 w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <button type="submit" className="bg-btt-navy text-white rounded-lg py-2.5 font-medium">Upload</button>
            </form>
          )}
          <ul className="divide-y border rounded-lg">
            {docs.map((d) => (
              <li key={d.id} className="p-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">{d.doc_type}</span> — {d.original_filename}
                  <div className="text-xs text-slate-500">
                    status: {d.status}{d.expiry_date ? ` · expiry ${String(d.expiry_date).slice(0, 10)}` : ""}
                  </div>
                </div>
                <a className="text-btt-accent hover:underline" href={d.file_path} target="_blank" rel="noreferrer">View</a>
              </li>
            ))}
            {!docs.length && <li className="p-3 text-slate-500 text-sm">No documents uploaded.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
