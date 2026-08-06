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
  vehicle_type_id: "",
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
  const [docStep, setDocStep] = useState(0);
  const [showOptional, setShowOptional] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const primarySections = useMemo(
    () => VEHICLE_DOC_SECTIONS.filter((s) => s.recommended),
    []
  );
  const optionalSections = useMemo(
    () => VEHICLE_DOC_SECTIONS.filter((s) => !s.recommended),
    []
  );
  const activeSections = showOptional
    ? [...primarySections, ...optionalSections]
    : primarySections;

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
    api
      .get("/vehicle-types")
      .then((r) => setVehicleTypes(r.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadDocs(selectedId).catch(console.error);
    setDocStep(0);
  }, [selectedId]);

  const selected = rows.find((r) => Number(r.id) === Number(selectedId));
  const canEditDocs =
    selected && ["draft", "rejected", "pending_review"].includes(selected.approval_status);

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
      if (!map[d.doc_type]) map[d.doc_type] = d;
    }
    return map;
  }, [docs]);

  const uploadedPrimary = primarySections.filter((s) => docsByType[s.type]).length;
  const currentSection = activeSections[Math.min(docStep, activeSections.length - 1)];

  // On open vehicle, jump to first missing / rejected recommended doc
  useEffect(() => {
    if (!selectedId || !docs.length && !activeSections.length) return;
    const idx = activeSections.findIndex(
      (s) => !docsByType[s.type] || docsByType[s.type]?.status === "rejected"
    );
    setDocStep(idx >= 0 ? idx : 0);
    // only when switching vehicle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const { data } = await api.post("/sm/vehicles", {
        ...form,
        vehicle_type_id: form.vehicle_type_id === "" ? null : Number(form.vehicle_type_id),
      });
      setMsg(`Vehicle ${data.registration_number} saved. Upload documents one by one.`);
      setForm(emptyForm);
      setSelectedId(data.id);
      setDocStep(0);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function uploadForType(section, file) {
    if (!selectedId) return setErr("Select or create a vehicle first");
    if (section.needsExpiry && !expiryByType[section.type]) {
      return setErr(`Please select expiry date for ${section.title} first.`);
    }
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
      setMsg(`${section.title} saved. Tap Next for the following document.`);
      await loadDocs(selectedId);
      await load();
      // auto-advance after successful upload
      setDocStep((s) => Math.min(s + 1, activeSections.length - 1));
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setUploadingType(null);
    }
  }

  async function removeDoc(doc) {
    if (!selectedId || !doc) return;
    if (!window.confirm(`Remove this file? You can upload again.`)) return;
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
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Add vehicle</h1>
        <p className="text-sm text-slate-600 mt-1">
          Simple 3 steps. Upload <strong>one document at a time</strong>.
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
        <li className="rounded-xl bg-btt-navy text-white px-2 py-2 font-semibold text-center">1. Details</li>
        <li className="rounded-xl bg-slate-200 text-slate-800 px-2 py-2 font-semibold text-center">2. Documents</li>
        <li className="rounded-xl bg-slate-200 text-slate-800 px-2 py-2 font-semibold text-center">3. Send</li>
      </ol>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {!selectedId && (
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
            <Field label="Vehicle type">
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base bg-white"
                value={form.vehicle_type_id}
                onChange={(e) => setForm({ ...form, vehicle_type_id: e.target.value })}
              >
                <option value="">Select type</option>
                {vehicleTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
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
          <button type="submit" className="w-full bg-btt-navy text-white rounded-xl py-3.5 text-base font-bold">
            Save & upload documents
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 border-b font-bold text-btt-navy flex justify-between items-center">
          <span>My vehicles</span>
          {selectedId ? (
            <button
              type="button"
              className="text-xs font-semibold text-btt-accent"
              onClick={() => {
                setSelectedId(null);
                setForm(emptyForm);
              }}
            >
              + Add another
            </button>
          ) : null}
        </div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className={`p-3 ${Number(selectedId) === Number(r.id) ? "bg-amber-50/70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-btt-navy">{r.registration_number}</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[r.approval_status]}`}>
                    {APPROVAL_STATUS_LABEL[r.approval_status] || r.approval_status}
                  </span>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-btt-accent text-white font-semibold text-sm"
                  onClick={() => {
                    setSelectedId(r.id);
                    setMsg("");
                    setErr("");
                    setDocStep(0);
                  }}
                >
                  {Number(selectedId) === Number(r.id) ? "Uploading…" : "Upload docs"}
                </button>
              </div>
            </li>
          ))}
          {!rows.length && <li className="p-4 text-slate-500 text-sm">No vehicles yet.</li>}
        </ul>
      </div>

      {selected && currentSection && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-lg font-bold text-btt-navy">
              Step 2 — Document {docStep + 1} of {activeSections.length}
            </h2>
            <p className="text-sm text-slate-600">
              Only one document is shown. Finish it, then tap <strong>Next</strong>.
            </p>

            {/* Checklist pills */}
            <div className="flex flex-wrap gap-1.5">
              {activeSections.map((s, i) => {
                const done = Boolean(docsByType[s.type]) && docsByType[s.type]?.status !== "rejected";
                return (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => setDocStep(i)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      i === docStep
                        ? "bg-btt-navy text-white border-btt-navy"
                        : done
                          ? "bg-green-100 text-green-800 border-green-300"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {done ? "✓ " : `${i + 1}. `}
                    {s.title}
                  </button>
                );
              })}
            </div>

            <div className="text-sm font-semibold text-slate-700">
              Main docs: {uploadedPrimary}/{primarySections.length}
            </div>
          </div>

          <DocUploadCard
            section={currentSection}
            index={docStep + 1}
            doc={docsByType[currentSection.type]}
            expiryValue={expiryByType[currentSection.type] || ""}
            onExpiryChange={(v) => setExpiryByType((prev) => ({ ...prev, [currentSection.type]: v }))}
            onUpload={(file) => uploadForType(currentSection, file)}
            onRemove={removeDoc}
            canEdit={Boolean(canEditDocs)}
            busy={uploadingType === currentSection.type}
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={docStep <= 0}
              className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-bold disabled:opacity-40"
              onClick={() => setDocStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            <button
              type="button"
              disabled={docStep >= activeSections.length - 1}
              className="flex-1 py-3 rounded-xl bg-btt-navy text-white font-bold disabled:opacity-40"
              onClick={() => setDocStep((s) => Math.min(activeSections.length - 1, s + 1))}
            >
              Next
            </button>
          </div>

          {!showOptional && (
            <button
              type="button"
              className="w-full py-2 text-sm font-semibold text-btt-accent"
              onClick={() => {
                setShowOptional(true);
                setDocStep(primarySections.length);
              }}
            >
              + Add optional docs (Permit / Photo / Other)
            </button>
          )}

          {["draft", "rejected"].includes(selected.approval_status) && (
            <button
              type="button"
              onClick={submitForApproval}
              disabled={uploadedPrimary < 1}
              className="w-full bg-btt-accent text-white rounded-xl py-4 text-base font-bold disabled:opacity-40"
            >
              Step 3 — Send to admin for approval
            </button>
          )}
          {selected.approval_status === "pending_review" && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Waiting for admin approval.
            </p>
          )}
          {selected.approval_status === "approved" && (
            <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-xl p-3">
              Approved — ready for issue indent.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
