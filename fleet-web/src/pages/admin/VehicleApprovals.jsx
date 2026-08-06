import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { DOC_STATUS_LABEL, VEHICLE_DOC_SECTIONS } from "../../constants/vehicleDocs";

function dateStr(v) {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

export default function AdminVehicleApprovals() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [note, setNote] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [docReject, setDocReject] = useState(null); // { id, note }

  async function load() {
    const [pending, notes] = await Promise.all([
      api.get("/admin/vehicles/pending-review"),
      api.get("/admin/notifications", { params: { unread: 1 } }),
    ]);
    setRows(pending.data);
    setNotifications(notes.data);
  }
  async function loadDocs(id) {
    if (!id) return setDocs([]);
    const { data } = await api.get(`/admin/vehicles/${id}/documents`);
    setDocs(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);
  useEffect(() => {
    loadDocs(selectedId).catch(console.error);
  }, [selectedId]);

  const selected = rows.find((r) => Number(r.id) === Number(selectedId));

  const docsByType = useMemo(() => {
    const map = {};
    for (const d of docs) {
      if (!map[d.doc_type]) map[d.doc_type] = d;
    }
    return map;
  }, [docs]);

  async function approve() {
    if (!selectedId) return;
    setErr("");
    setMsg("");
    try {
      await api.post(`/admin/vehicles/${selectedId}/approve`);
      setMsg("Vehicle approved. Site manager can now issue indents for this vehicle.");
      setSelectedId(null);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function reject() {
    if (!selectedId) return;
    if (!note.trim()) return setErr("Please write a short reason for rejection.");
    setErr("");
    setMsg("");
    try {
      await api.post(`/admin/vehicles/${selectedId}/reject`, { rejection_note: note.trim() });
      setMsg("Vehicle rejected. Site manager can fix and send again.");
      setNote("");
      setSelectedId(null);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function approveDoc(docId) {
    setErr("");
    try {
      await api.post(`/admin/vehicles/documents/${docId}/approve`);
      await loadDocs(selectedId);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function rejectDoc() {
    if (!docReject?.id) return;
    if (!docReject.note?.trim()) return setErr("Write why this document is rejected.");
    setErr("");
    try {
      await api.post(`/admin/vehicles/documents/${docReject.id}/reject`, {
        rejection_note: docReject.note.trim(),
      });
      setDocReject(null);
      await loadDocs(selectedId);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function markRead(id) {
    await api.post(`/admin/notifications/${id}/read`);
    await load();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Vehicle approvals</h1>
        <p className="text-sm text-slate-600 mt-1">
          Open a vehicle, check each document, then Approve or Reject. Until approved, site manager cannot assign work.
        </p>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {!!notifications.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="font-bold text-amber-950 mb-2">New submissions ({notifications.length})</div>
          <ul className="space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="flex justify-between gap-3 items-start">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-amber-900/80">{n.body}</div>
                </div>
                <button type="button" className="text-xs font-semibold text-btt-accent shrink-0" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b font-bold text-btt-navy">Waiting for your review</div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className={`p-4 ${Number(selectedId) === Number(r.id) ? "bg-amber-50/50" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-lg text-btt-navy">{r.registration_number}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    By {r.submitted_by_name || "—"} · {r.client_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.doc_count} document(s) · {r.pending_doc_count} waiting check ·{" "}
                    {r.submitted_at ? String(r.submitted_at).replace("T", " ").slice(0, 16) : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-btt-navy text-white font-semibold text-sm"
                  onClick={() => {
                    setSelectedId(r.id);
                    setNote("");
                    setErr("");
                    setMsg("");
                  }}
                >
                  Review documents
                </button>
              </div>
            </li>
          ))}
          {!rows.length && <li className="p-4 text-slate-500 text-sm">No vehicles waiting.</li>}
        </ul>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-btt-navy">Review {selected.registration_number}</h2>
              <p className="text-sm text-slate-600 mt-1">Check each document below, then approve or reject the vehicle.</p>
            </div>
            <button type="button" className="text-sm text-slate-600 underline" onClick={() => setSelectedId(null)}>
              Close
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div>
              <span className="text-slate-500">Owner</span>
              <div className="font-semibold">{selected.owner_name || "—"}</div>
            </div>
            <div>
              <span className="text-slate-500">Phone</span>
              <div className="font-semibold">{selected.owner_phone || "—"}</div>
            </div>
            <div>
              <span className="text-slate-500">Model</span>
              <div className="font-semibold">{selected.vehicle_type_name || selected.make_model || "—"}</div>
            </div>
            <div>
              <span className="text-slate-500">Fuel</span>
              <div className="font-semibold">{selected.fuel_type || "—"}</div>
            </div>
            <div>
              <span className="text-slate-500">Insurance expiry</span>
              <div className="font-semibold">{dateStr(selected.insurance_expiry)}</div>
            </div>
            <div>
              <span className="text-slate-500">Fitness expiry</span>
              <div className="font-semibold">{dateStr(selected.fitness_expiry)}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-btt-navy">Documents checklist</h3>
            {VEHICLE_DOC_SECTIONS.map((section) => {
              const d = docsByType[section.type];
              return (
                <div
                  key={section.type}
                  className={`rounded-2xl border-2 p-4 ${
                    !d
                      ? "border-slate-200 bg-slate-50"
                      : d.status === "approved"
                        ? "border-green-300 bg-green-50/50"
                        : d.status === "rejected"
                          ? "border-red-300 bg-red-50/40"
                          : "border-amber-200 bg-amber-50/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-btt-navy">{section.title}</div>
                      <div className="text-xs text-slate-500">{section.short}</div>
                      {d ? (
                        <>
                          <div className="text-sm mt-2 font-medium truncate max-w-xs sm:max-w-md">{d.original_filename}</div>
                          <div className="text-xs mt-1 font-semibold text-slate-700">
                            {DOC_STATUS_LABEL[d.status] || d.status}
                            {d.expiry_date ? ` · expiry ${dateStr(d.expiry_date)}` : ""}
                          </div>
                          {d.rejection_note ? (
                            <div className="text-xs text-red-700 mt-1">Note: {d.rejection_note}</div>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-sm text-slate-500 mt-2">Not uploaded</div>
                      )}
                    </div>
                    {d && (
                      <div className="flex flex-wrap gap-2">
                        <a
                          className="px-3 py-2 rounded-xl bg-white border text-sm font-semibold text-btt-navy"
                          href={d.file_path}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open file
                        </a>
                        {d.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="px-3 py-2 rounded-xl bg-green-700 text-white text-sm font-semibold"
                              onClick={() => approveDoc(d.id)}
                            >
                              Verify OK
                            </button>
                            <button
                              type="button"
                              className="px-3 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold"
                              onClick={() => setDocReject({ id: d.id, note: "" })}
                            >
                              Reject doc
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800">
              Rejection reason (required only if rejecting the whole vehicle)
            </label>
            <textarea
              className="mt-1 w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Example: Insurance expired / RC unclear — please re-upload"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={approve} className="flex-1 min-w-[140px] bg-green-700 text-white px-4 py-3 rounded-xl font-bold">
              Approve vehicle
            </button>
            <button type="button" onClick={reject} className="flex-1 min-w-[140px] bg-red-700 text-white px-4 py-3 rounded-xl font-bold">
              Reject vehicle
            </button>
          </div>
        </div>
      )}

      {docReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-xl">
            <h3 className="text-lg font-bold text-btt-navy">Reject this document</h3>
            <p className="text-sm text-slate-600">Write a short reason so the site manager knows what to fix.</p>
            <textarea
              className="w-full border-2 rounded-xl px-3 py-3 text-base"
              rows={3}
              value={docReject.note}
              onChange={(e) => setDocReject({ ...docReject, note: e.target.value })}
              placeholder="Example: Photo is blurry"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-xl border" onClick={() => setDocReject(null)}>
                Cancel
              </button>
              <button type="button" className="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold" onClick={rejectDoc}>
                Reject document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
