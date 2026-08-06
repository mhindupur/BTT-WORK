import { useEffect, useState } from "react";
import api from "../../api";

export default function AdminVehicleApprovals() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [note, setNote] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

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
    if (!note.trim()) return setErr("Enter a rejection note");
    setErr("");
    setMsg("");
    try {
      await api.post(`/admin/vehicles/${selectedId}/reject`, { rejection_note: note.trim() });
      setMsg("Vehicle rejected. Site manager can fix and re-submit.");
      setNote("");
      setSelectedId(null);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function reviewDoc(docId, action) {
    setErr("");
    try {
      if (action === "approve") {
        await api.post(`/admin/vehicles/documents/${docId}/approve`);
      } else {
        const n = window.prompt("Rejection note for this document?");
        if (!n) return;
        await api.post(`/admin/vehicles/documents/${docId}/reject`, { rejection_note: n });
      }
      await loadDocs(selectedId);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function markRead(id) {
    await api.post(`/admin/notifications/${id}/read`);
    await load();
  }

  const selected = rows.find((r) => Number(r.id) === Number(selectedId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-btt-navy">Vehicle approvals</h1>
        <p className="text-sm text-slate-600 mt-1">
          Review vehicles and documents submitted by site managers. Until approved, they cannot assign work / issue
          indents.
        </p>
      </div>
      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {!!notifications.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-semibold text-amber-950 mb-2">Notifications ({notifications.length})</div>
          <ul className="space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="flex justify-between gap-3 items-start">
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-amber-900/80">{n.body}</div>
                </div>
                <button type="button" className="text-xs text-btt-accent shrink-0" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Reg No</th>
              <th className="p-3">Submitted by</th>
              <th className="p-3">Client</th>
              <th className="p-3">Docs</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.registration_number}</td>
                <td className="p-3">{r.submitted_by_name || "—"}</td>
                <td className="p-3">{r.client_name}</td>
                <td className="p-3">{r.doc_count} ({r.pending_doc_count} pending)</td>
                <td className="p-3">{r.submitted_at ? String(r.submitted_at).replace("T", " ").slice(0, 16) : "—"}</td>
                <td className="p-3">
                  <button type="button" className="text-btt-accent font-medium hover:underline"
                    onClick={() => setSelectedId(r.id)}>Review</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="p-4 text-slate-500">No vehicles pending review.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-semibold text-btt-navy text-lg">Review {selected.registration_number}</h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <div>Owner: {selected.owner_name || "—"}</div>
            <div>Phone: {selected.owner_phone || "—"}</div>
            <div>Model: {selected.make_model || "—"}</div>
            <div>Fuel: {selected.fuel_type || "—"}</div>
            <div>Ins exp: {selected.insurance_expiry ? String(selected.insurance_expiry).slice(0, 10) : "—"}</div>
            <div>FC exp: {selected.fitness_expiry ? String(selected.fitness_expiry).slice(0, 10) : "—"}</div>
          </div>
          <div>
            <div className="font-medium mb-2">Documents</div>
            <ul className="divide-y border rounded-lg">
              {docs.map((d) => (
                <li key={d.id} className="p-3 flex flex-wrap gap-2 justify-between items-center text-sm">
                  <div>
                    <span className="font-medium">{d.doc_type}</span> — {d.original_filename}{" "}
                    <span className="text-xs text-slate-500">({d.status})</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <a className="text-btt-accent hover:underline" href={d.file_path} target="_blank" rel="noreferrer">View</a>
                    {d.status === "pending" && (
                      <>
                        <button type="button" className="text-green-700 font-medium" onClick={() => reviewDoc(d.id, "approve")}>Verify</button>
                        <button type="button" className="text-red-700 font-medium" onClick={() => reviewDoc(d.id, "reject")}>Reject</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
              {!docs.length && <li className="p-3 text-slate-500">No documents.</li>}
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Rejection note (required to reject vehicle)</label>
            <textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={note}
              onChange={(e) => setNote(e.target.value)} placeholder="Leave a note if rejecting…" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={approve} className="bg-green-700 text-white px-4 py-2 rounded-lg font-medium">Approve vehicle</button>
            <button type="button" onClick={reject} className="bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Reject vehicle</button>
            <button type="button" onClick={() => setSelectedId(null)} className="border px-4 py-2 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
