import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import DocUploadCard from "../../components/DocUploadCard";
import ListToolbar from "../../components/ListToolbar";
import VehicleInfoFields from "../../components/VehicleInfoFields";
import {
  detailsPayload,
  emptyVehicleDetails,
} from "../../constants/vehicleFields";
import { downloadExcel, excelStamp } from "../../utils/exportExcel";
import { formatRegInput, isSlaExceeded, normalizeVehicleRegistration } from "../../utils/vehicleReg";
import {
  APPROVAL_STATUS_LABEL,
  OPTIONAL_DOC_SECTIONS,
  PRIMARY_DOC_SECTIONS,
  VEHICLE_DOC_SECTIONS,
} from "../../constants/vehicleDocs";

const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-800",
  pending_review: "bg-amber-100 text-amber-950",
  approved: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
};

const emptyForm = () => ({
  registration_number: "",
  vehicle_type_id: "",
  ...emptyVehicleDetails(),
});

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

function matchesSearch(r, q) {
  if (!q) return true;
  const hay = [
    r.registration_number,
    r.vehicle_serial,
    r.owner_name,
    r.ownership,
    r.engine_number,
    r.chassis_number,
    r.make_model,
    r.vehicle_type_name,
    r.approval_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function SmVehicles() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [expiryByType, setExpiryByType] = useState({});
  const [uploadingType, setUploadingType] = useState(null);
  const [docStep, setDocStep] = useState(0);
  const [includeOptional, setIncludeOptional] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const activeSections = useMemo(
    () => (includeOptional ? [...PRIMARY_DOC_SECTIONS, ...OPTIONAL_DOC_SECTIONS] : PRIMARY_DOC_SECTIONS),
    [includeOptional]
  );

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
    setIncludeOptional(false);
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

  const q = search.trim().toLowerCase();
  const approvedRows = useMemo(
    () => rows.filter((r) => r.approval_status === "approved" && matchesSearch(r, q)),
    [rows, q]
  );
  const attentionRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          ["draft", "pending_review", "rejected"].includes(r.approval_status) && matchesSearch(r, q)
      ),
    [rows, q]
  );

  function exportApproved() {
    downloadExcel({
      filename: `my-approved-vehicles-${excelStamp()}.xlsx`,
      sheetName: "ApprovedVehicles",
      rows: approvedRows,
      columns: [
        { header: "Registration", value: (r) => r.registration_number || "" },
        { header: "Serial", value: (r) => r.vehicle_serial || "" },
        { header: "Type", value: (r) => r.vehicle_type_name || r.make_model || "" },
        { header: "Owner", value: (r) => r.owner_name || "" },
        { header: "Owner phone", value: (r) => r.owner_phone || "" },
        { header: "Status", value: (r) => APPROVAL_STATUS_LABEL[r.approval_status] || r.approval_status },
        { header: "Documents", value: (r) => r.doc_count ?? 0 },
      ],
    });
  }

  const uploadedPrimary = PRIMARY_DOC_SECTIONS.filter((s) => docsByType[s.type]).length;
  const currentSection = activeSections[Math.min(docStep, Math.max(activeSections.length - 1, 0))];

  useEffect(() => {
    if (!selectedId) return;
    const idx = activeSections.findIndex(
      (s) => !docsByType[s.type] || docsByType[s.type]?.status === "rejected"
    );
    setDocStep(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function resetAddForm() {
    setForm(emptyForm());
    setShowAdd(false);
  }

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const reg = normalizeVehicleRegistration(form.registration_number);
      if (!reg) {
        setErr("Enter vehicle number in CAPS without hyphen, e.g. KA01MM1234");
        return;
      }
      const { data } = await api.post("/sm/vehicles", {
        registration_number: reg,
        vehicle_type_id: form.vehicle_type_id === "" ? null : Number(form.vehicle_type_id),
        ...detailsPayload(form),
      });
      setMsg(`Vehicle ${data.registration_number} saved. Upload documents below.`);
      setForm(emptyForm());
      setShowAdd(false);
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
      setMsg(`${section.title} saved.`);
      await loadDocs(selectedId);
      await load();
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

  function toggleSelect(id) {
    if (Number(selectedId) === Number(id)) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
      setMsg("");
      setErr("");
      setDocStep(0);
      setShowAdd(false);
    }
  }

  function renderUploadPanel() {
    if (!selected || !currentSection) return null;
    return (
      <div className="mt-3 space-y-3 border-t border-amber-200 pt-3">
        <div className="space-y-2">
          <h3 className="text-base font-bold text-btt-navy">
            Upload documents — {selected.registration_number}
          </h3>
          {selected.approval_status === "rejected" && selected.rejection_note ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
              <div className="font-bold text-xs uppercase tracking-wide mb-1">Vehicle rejected by admin</div>
              <div>{selected.rejection_note}</div>
            </div>
          ) : null}
          {PRIMARY_DOC_SECTIONS.concat(OPTIONAL_DOC_SECTIONS)
            .map((s) => docsByType[s.type])
            .filter((d) => d && d.status === "rejected").length > 0 ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
              <div className="font-bold text-xs uppercase tracking-wide text-red-900">
                Documents rejected — fix and re-upload
              </div>
              <ul className="space-y-2">
                {PRIMARY_DOC_SECTIONS.concat(OPTIONAL_DOC_SECTIONS).map((s) => {
                  const d = docsByType[s.type];
                  if (!d || d.status !== "rejected") return null;
                  return (
                    <li key={s.type} className="text-sm text-red-900 bg-white/70 border border-red-100 rounded-lg p-2">
                      <div className="font-semibold">{s.title}</div>
                      <div className="mt-0.5">
                        {d.rejection_note ? (
                          <>
                            <span className="text-xs font-bold uppercase text-red-800">Reason: </span>
                            {d.rejection_note}
                          </>
                        ) : (
                          <span className="text-slate-700">No reason given — please re-upload a clearer file.</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="mt-1 text-xs font-semibold text-btt-accent underline"
                        onClick={() => {
                          const idx = activeSections.findIndex((x) => x.type === s.type);
                          if (idx >= 0) setDocStep(idx);
                          else if (s.optional) {
                            setIncludeOptional(true);
                            setDocStep(PRIMARY_DOC_SECTIONS.length);
                          }
                        }}
                      >
                        Open this document
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <p className="text-sm text-slate-600">
            Document {docStep + 1} of {activeSections.length}. Finish one, then tap Next.
          </p>
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
                        : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {done ? "✓ " : `${i + 1}. `}
                  {s.title}
                  {s.optional ? " (optional)" : ""}
                </button>
              );
            })}
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Required docs: {uploadedPrimary}/{PRIMARY_DOC_SECTIONS.length}
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
            className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-bold disabled:opacity-40 bg-white"
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

        {!includeOptional && (
          <button
            type="button"
            className="w-full py-2 text-sm font-semibold text-btt-accent"
            onClick={() => {
              setIncludeOptional(true);
              setDocStep(PRIMARY_DOC_SECTIONS.length);
            }}
          >
            + Add optional Other document
          </button>
        )}

        {["draft", "rejected"].includes(selected.approval_status) && (
          <button
            type="button"
            onClick={submitForApproval}
            disabled={uploadedPrimary < 1}
            className="w-full bg-btt-accent text-white rounded-xl py-3.5 text-base font-bold disabled:opacity-40"
          >
            Send to admin for approval
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
    );
  }

  function renderVehicleRow(r) {
    const isOpen = Number(selectedId) === Number(r.id);
    const needsDocs = ["draft", "rejected", "pending_review"].includes(r.approval_status);
    return (
      <li key={r.id} className={`p-3 ${isOpen ? "bg-amber-50/80" : isSlaExceeded(r) ? "bg-orange-50" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-btt-navy font-mono">{r.registration_number}</div>
            {r.vehicle_serial ? (
              <div className="text-xs font-mono text-slate-600">Serial {r.vehicle_serial}</div>
            ) : null}
            {isSlaExceeded(r) ? (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-600 text-white">
                Over SLA age
              </span>
            ) : null}
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[r.approval_status]}`}
            >
              {APPROVAL_STATUS_LABEL[r.approval_status] || r.approval_status}
            </span>
            <div className="text-xs text-slate-500 mt-1">
              {r.make_model || r.vehicle_type_name || "—"} · {r.doc_count || 0} doc(s)
              {r.owner_name ? ` · ${r.owner_name}` : ""}
            </div>
          </div>
          {needsDocs ? (
            <button
              type="button"
              className={`px-3 py-2 rounded-xl font-semibold text-sm ${
                isOpen ? "bg-slate-700 text-white" : "bg-btt-accent text-white"
              }`}
              onClick={() => toggleSelect(r.id)}
            >
              {isOpen ? "Hide uploads" : "Upload docs"}
            </button>
          ) : null}
        </div>
        {isOpen ? renderUploadPanel() : null}
      </li>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-btt-navy">Vehicles</h1>
          <p className="text-sm text-slate-600 mt-1">
            Approved vehicles for your site are listed below. Use <strong>Add vehicle</strong> to submit a
            new one for admin review.
          </p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold self-start ${
            showAdd ? "border border-slate-300 bg-white text-slate-700" : "bg-btt-navy text-white"
          }`}
          onClick={() => {
            setShowAdd((v) => !v);
            setErr("");
            setMsg("");
            if (showAdd) setForm(emptyForm());
            else setSelectedId(null);
          }}
          aria-expanded={showAdd}
        >
          {showAdd ? "Hide add form" : "Add vehicle"}
        </button>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {showAdd && (
        <form onSubmit={create} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-btt-navy">New vehicle</h2>
          <p className="text-sm text-slate-600">
            Step 1: vehicle details. After save, upload documents and expiry dates. Permit and vehicle
            photo are included; Other is optional.
          </p>
          <Field label="Vehicle number (Reg No) *">
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base uppercase font-mono"
              placeholder="KA01MM1234"
              value={form.registration_number}
              onChange={(e) => setForm({ ...form, registration_number: formatRegInput(e.target.value) })}
              required
            />
          </Field>
          <VehicleInfoFields
            value={form}
            onChange={setForm}
            vehicleTypes={vehicleTypes}
            showStatus={false}
            showExpirySection={false}
            dense
          />
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            Certificate expiry dates (insurance, fitness, PUC, tax, permit) are entered when you upload
            each document.
          </p>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-medium"
              onClick={resetAddForm}
            >
              Cancel
            </button>
            <button type="submit" className="bg-btt-navy text-white rounded-xl py-2.5 px-4 font-semibold">
              Save & upload documents
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <ListToolbar
          title="Approved vehicles"
          count={approvedRows.length}
          totalCount={rows.filter((r) => r.approval_status === "approved").length}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search registration, serial, owner, type…"
          onExport={exportApproved}
          exportDisabled={!approvedRows.length}
        />
        <ul className="divide-y">
          {approvedRows.map(renderVehicleRow)}
          {!approvedRows.length && (
            <li className="p-4 text-slate-500 text-sm">
              {rows.some((r) => r.approval_status === "approved")
                ? "No approved vehicles match your search."
                : "No approved vehicles yet. Click Add vehicle to submit one."}
            </li>
          )}
        </ul>
      </div>

      {attentionRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
          <div className="p-3 border-b bg-amber-50">
            <div className="font-bold text-amber-950">Needs attention ({attentionRows.length})</div>
            <p className="text-xs text-amber-900/80 mt-0.5">
              Draft, pending review, or rejected — upload documents and send for approval.
            </p>
          </div>
          <ul className="divide-y">{attentionRows.map(renderVehicleRow)}</ul>
        </div>
      )}
    </div>
  );
}
