import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import DocUploadCard from "../../components/DocUploadCard";
import {
  APPROVAL_STATUS_LABEL,
  VEHICLE_DOC_SECTIONS,
} from "../../constants/vehicleDocs";

const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-800",
  pending_review: "bg-amber-100 text-amber-950",
  approved: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
};

const emptyForm = {
  registration_number: "",
  owner_name: "",
  owner_phone: "",
  make_model: "",
  fuel_type: "",
  notes: "",
};

function dateStr(v) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

/** Must live outside SmVehicles — defining it inside remounts inputs on every keystroke and steals focus. */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function SmVehicles() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [expiryByType, setExpiryByType] = useState({});
  const [uploadingType, setUploadingType] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await api.get("/sm/vehicles/mine");
    setRows(data);
  }
  async function loadDocs(id) {
    if (!id) {
      setDocs([]);
      return;
    }
    const { data } = await api.get(`/sm/vehicles/${id}/documents`);
    setDocs(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useEffect(() => {
    loadDocs(selectedId).catch(console.error);
  }, [selectedId]);

  const selected = rows.find((r) => Number(r.id) === Number(selectedId));
  const canEditDocs =
    selected && ["draft", "rejected", "pending_review"].includes(selected.approval_status);

  // Prefill expiry pickers from vehicle row / latest doc
  useEffect(() => {
    if (!selected) {
      setExpiryByType({});
      return;
    }
    const next = {};
    for (const s of VEHICLE_DOC_SECTIONS) {
      if (!s.needsExpiry) continue;
      const fromDoc = docs.find((d) => d.doc_type === s.type);
      const fromVehicle = s.vehicleDateField ? selected[s.vehicleDateField] : null;
      next[s.type] = dateStr(fromDoc?.expiry_date || fromVehicle || "");
    }
    setExpiryByType(next);
  }, [selectedId, selected?.id, docs]);

  const docsByType = useMemo(() => {
    const map = {};
    for (const d of docs) {
      if (!map[d.doc_type]) map[d.doc_type] = d; // newest first from API
    }
    return map;
  }, [docs]);

  const uploadedCount = VEHICLE_DOC_SECTIONS.filter((s) => docsByType[s.type]).length;
  const recommendedMissing = VEHICLE_DOC_SECTIONS.filter(
    (s) => s.recommended && !docsByType[s.type]
  );

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const { data } = await api.post("/sm/vehicles", form);
      setMsg(`Vehicle ${data.registration_number} saved. Now upload documents below.`);
      setForm(emptyForm);
      setSelectedId(data.id);
      await load();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function uploadForType(section, file) {
    if (!selectedId) return setErr("Select or create a vehicle first");
    setErr("");
    setMsg("");
    setUploadingType(section.type);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", section.type);
    const exp = expiryByType[section.type];
    if (exp) fd.append("expiry_date", exp);
    try {
      await api.post(`/sm/vehicles/${selectedId}/documents`, fd);
      setMsg(`${section.title} uploaded successfully.`);
      await loadDocs(selectedId);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setUploadingType(null);
    }
  }

  async function removeDoc(doc) {
    if (!selectedId || !doc) return;
    if (!window.confirm(`Remove ${doc.doc_type} file? You can upload again later.`)) return;
    setErr("");
    setMsg("");
    try {
      await api.delete(`/sm/vehicles/${selectedId}/documents/${doc.id}`);
      setMsg("Document removed.");
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
      setMsg("Sent to BTT admin. You cannot issue indents until admin approves.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Add vehicle & documents</h1>
        <p className="text-sm text-slate-600 mt-1">
          Follow the steps. Upload one document in each box. Admin must approve before you can issue work.
        </p>
      </div>

      <ol className="grid sm:grid-cols-3 gap-2 text-sm">
        <li className="rounded-xl bg-btt-navy text-white px-3 py-2 font-medium">1. Vehicle details</li>
        <li className="rounded-xl bg-slate-100 text-slate-800 px-3 py-2 font-medium">2. Upload documents</li>
        <li className="rounded-xl bg-slate-100 text-slate-800 px-3 py-2 font-medium">3. Send to admin</li>
      </ol>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      <form onSubmit={create} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-btt-navy">Step 1 — Vehicle details</h2>
        <Field label="Vehicle number *">
          <input
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base uppercase"
            placeholder="e.g. KA01AB1234"
            value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: e.target.value.toUpperCase() })}
            required
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Owner name">
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
          </Field>
          <Field label="Owner phone">
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base"
              inputMode="numeric"
              value={form.owner_phone}
              onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
            />
          </Field>
          <Field label="Model">
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base"
              placeholder="SUV / Sedan / Truck"
              value={form.make_model}
              onChange={(e) => setForm({ ...form, make_model: e.target.value })}
            />
          </Field>
          <Field label="Fuel type">
            <select
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base bg-white"
              value={form.fuel_type}
              onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
            >
              <option value="">Select</option>
              <option value="DIE">Diesel</option>
              <option value="PET">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="ELE">Electric</option>
            </select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <input
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <button type="submit" className="w-full bg-btt-navy text-white rounded-xl py-3.5 text-base font-bold">
          Save vehicle & continue to documents
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b font-bold text-btt-navy">My vehicles</div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className={`p-4 ${Number(selectedId) === Number(r.id) ? "bg-amber-50/60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-lg text-btt-navy">{r.registration_number}</div>
                  <div className="mt-1">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_BADGE[r.approval_status]}`}>
                      {APPROVAL_STATUS_LABEL[r.approval_status] || r.approval_status}
                    </span>
                  </div>
                  {r.rejection_note ? (
                    <div className="text-sm text-red-700 mt-2">Admin note: {r.rejection_note}</div>
                  ) : null}
                  <div className="text-xs text-slate-500 mt-1">{r.doc_count || 0} document(s) uploaded</div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-btt-accent text-white font-semibold text-sm"
                  onClick={() => {
                    setSelectedId(r.id);
                    setMsg("");
                    setErr("");
                  }}
                >
                  {Number(selectedId) === Number(r.id) ? "Selected" : "Open documents"}
                </button>
              </div>
            </li>
          ))}
          {!rows.length && <li className="p-4 text-slate-500 text-sm">No vehicles yet — fill Step 1 above.</li>}
        </ul>
      </div>

      {selected && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <h2 className="text-lg font-bold text-btt-navy">
              Step 2 — Documents for {selected.registration_number}
            </h2>
            <p className="text-sm text-slate-600">
              For each box: pick expiry date (if asked), then drop or choose the file.
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="flex justify-between text-sm font-semibold text-slate-800 mb-2">
                <span>Progress</span>
                <span>
                  {uploadedCount} / {VEHICLE_DOC_SECTIONS.length} uploaded
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${Math.round((uploadedCount / VEHICLE_DOC_SECTIONS.length) * 100)}%` }}
                />
              </div>
              {recommendedMissing.length > 0 && canEditDocs && (
                <p className="text-xs text-amber-900 mt-2">
                  Still recommended: {recommendedMissing.map((s) => s.title).join(", ")}
                </p>
              )}
            </div>

            {["draft", "rejected"].includes(selected.approval_status) && (
              <button
                type="button"
                onClick={submitForApproval}
                disabled={!docs.length}
                className="w-full bg-btt-accent text-white rounded-xl py-3.5 text-base font-bold disabled:opacity-40"
              >
                Step 3 — Send to BTT admin for approval
              </button>
            )}
            {selected.approval_status === "pending_review" && (
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Waiting for admin approval. You can still replace a document if needed.
              </p>
            )}
            {selected.approval_status === "approved" && (
              <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-xl p-3">
                Approved. This vehicle can be used for issue indent / work.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {VEHICLE_DOC_SECTIONS.map((section, i) => (
              <DocUploadCard
                key={section.type}
                section={section}
                index={i + 1}
                doc={docsByType[section.type]}
                expiryValue={expiryByType[section.type] || ""}
                onExpiryChange={(v) => setExpiryByType((prev) => ({ ...prev, [section.type]: v }))}
                onUpload={(file) => uploadForType(section, file)}
                onRemove={removeDoc}
                canEdit={Boolean(canEditDocs)}
                busy={uploadingType === section.type}
              />
            ))}
          </div>

          {["draft", "rejected"].includes(selected.approval_status) && (
            <button
              type="button"
              onClick={submitForApproval}
              disabled={!docs.length}
              className="w-full bg-btt-accent text-white rounded-xl py-3.5 text-base font-bold disabled:opacity-40"
            >
              Step 3 — Send to BTT admin for approval
            </button>
          )}
        </div>
      )}
    </div>
  );
}
