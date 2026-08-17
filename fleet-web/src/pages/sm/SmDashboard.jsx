import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import { VEHICLE_DOC_SECTIONS } from "../../constants/vehicleDocs";

function Stat({ label, value, tone = "default", to }) {
  const tones = {
    default: "text-btt-navy",
    ok: "text-green-700",
    warn: "text-amber-700",
    danger: "text-red-700",
  };
  const body = (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm h-full">
      <div className={`text-2xl font-bold tabular-nums ${tones[tone] || tones.default}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-700 mt-1">{label}</div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function docTitle(type) {
  return VEHICLE_DOC_SECTIONS.find((s) => s.type === type)?.title || type;
}

export default function SmDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/sm/dashboard/summary")
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <p className="text-red-600 text-sm">{err}</p>;
  if (!data) return <p className="text-slate-500 text-sm">Loading dashboard…</p>;

  const t = data.totals;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-btt-navy leading-tight">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {data.profile?.client_name || "Your site"}
          {data.profile?.location_label ? ` · ${data.profile.location_label}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="My vehicles" value={t.vehicles} to="/sm/vehicles" />
        <Stat label="Approved" value={t.approved} tone="ok" to="/sm/vehicles" />
        <Stat label="Waiting admin" value={t.pending_review} tone="warn" to="/sm/vehicles" />
        <Stat label="Rejected" value={t.rejected} tone="danger" to="/sm/vehicles" />
        <Stat label="Drafts" value={t.draft} to="/sm/vehicles" />
        <Stat label="Serials left" value={t.serials_available} tone={t.serials_available ? "ok" : "warn"} />
        <Stat label="Pending indents" value={t.pending_indents} to="/sm/my-indents" />
        <Stat label="Docs rejected" value={t.rejected_documents} tone={t.rejected_documents ? "danger" : "ok"} to="/sm/vehicles" />
      </div>

      {(data.rejected_documents?.length > 0 || data.rejected_vehicles?.length > 0) && (
        <section className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-red-950">Action needed — admin feedback</h2>

          {data.rejected_vehicles?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-red-900">Rejected vehicles</div>
              {data.rejected_vehicles.map((v) => (
                <div key={v.id} className="bg-white border border-red-100 rounded-xl p-3 text-sm">
                  <div className="font-bold text-btt-navy">{v.registration_number}</div>
                  <div className="mt-1 text-red-900">
                    <span className="text-xs font-bold uppercase">Reason: </span>
                    {v.rejection_note || "No reason given — open vehicle and fix documents."}
                  </div>
                  <Link to="/sm/vehicles" className="inline-block mt-2 text-xs font-semibold text-btt-accent underline">
                    Fix vehicle documents
                  </Link>
                </div>
              ))}
            </div>
          )}

          {data.rejected_documents?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-red-900">Rejected documents</div>
              {data.rejected_documents.map((d) => (
                <div key={d.id} className="bg-white border border-red-100 rounded-xl p-3 text-sm">
                  <div className="font-bold text-btt-navy">
                    {d.registration_number} · {docTitle(d.doc_type)}
                  </div>
                  <div className="mt-1 text-red-900">
                    <span className="text-xs font-bold uppercase">Reason: </span>
                    {d.rejection_note || "No reason given — please re-upload a clearer file."}
                  </div>
                  <Link to="/sm/vehicles" className="inline-block mt-2 text-xs font-semibold text-btt-accent underline">
                    Re-upload
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3">
        <Link
          to="/sm/vehicles"
          className="block bg-btt-navy text-white text-center py-3.5 rounded-xl font-medium min-h-[48px] flex items-center justify-center"
        >
          Vehicles &amp; documents
        </Link>
        <Link
          to="/sm/issue-indent"
          className="block bg-btt-accent text-white text-center py-3.5 rounded-xl font-medium min-h-[48px] flex items-center justify-center"
        >
          Issue advance indent
        </Link>
        <Link
          to="/sm/my-indents"
          className="block bg-white border-2 border-slate-200 text-center py-3.5 rounded-xl font-medium text-btt-navy min-h-[48px] flex items-center justify-center"
        >
          My indents
        </Link>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-bold text-btt-navy mb-3">Recent indents</h2>
        <ul className="space-y-2 text-sm">
          {(data.recent_indents || []).length === 0 && (
            <li className="text-slate-500">No indents yet.</li>
          )}
          {(data.recent_indents || []).map((i) => (
            <li key={i.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <div className="font-mono font-semibold">{i.serial_number}</div>
                <div className="text-xs text-slate-500">{i.registration_number}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">₹{i.amount_rs}</div>
                <div className="text-xs text-slate-500">{i.status}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
