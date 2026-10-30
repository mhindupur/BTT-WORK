import { useEffect, useState } from "react";
import api from "../../api";

function dateStr(v) {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

function dateTimeStr(v) {
  if (!v) return "—";
  return String(v).replace("T", " ").slice(0, 19);
}

export default function AdminExpiryReminders() {
  const [schedule, setSchedule] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [runs, setRuns] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, u, h, r] = await Promise.all([
      api.get("/admin/expiry-reminders/schedule"),
      api.get("/admin/expiry-reminders/upcoming"),
      api.get("/admin/expiry-reminders/history", { params: { limit: 80 } }),
      api.get("/admin/expiry-reminders/runs"),
    ]);
    setSchedule(s.data);
    setUpcoming(u.data);
    setHistory(h.data);
    setRuns(r.data);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  async function runNow(force = false) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const { data } = await api.post("/admin/expiry-reminders/run", { force });
      if (data.skipped) {
        setMsg(`Already ran for ${data.run_date}. Use force re-run if needed.`);
      } else {
        setMsg(
          `Run ${data.run_date}: ${data.sent} sent, ${data.failed} failed, ${data.skipped} skipped (${data.candidates} candidates).`
        );
      }
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Document expiry reminders</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            WhatsApp reminders for Driving license, RC, Insurance, PUC, Fitness, Tax, Permit and related
            documents — 1 month, 15 days, then daily in the last 7 days. Site manager is notified 1 day
            before if the renewed document is not yet admin-approved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-btt-navy text-white disabled:opacity-60"
            onClick={() => runNow(false)}
          >
            Run today
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 bg-white disabled:opacity-60"
            onClick={() => runNow(true)}
          >
            Force re-run
          </button>
        </div>
      </div>

      {err && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {schedule && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-2">
          <div className="font-semibold text-btt-navy">Schedule</div>
          <div>
            Days before: <span className="font-mono">{schedule.days_before?.join(", ")}</span>
          </div>
          <div>
            Timezone: <span className="font-mono">{schedule.timezone}</span> · Channel:{" "}
            <span className="font-mono">{schedule.channel}</span> · Cron:{" "}
            {schedule.cron_enabled ? "enabled" : "disabled"}
          </div>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            {(schedule.notes || []).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-btt-navy">Upcoming (next 30 days)</div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left sticky top-0">
                <tr>
                  <th className="p-2">Entity</th>
                  <th className="p-2">Document</th>
                  <th className="p-2">Expiry</th>
                  <th className="p-2">Days</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r, i) => (
                  <tr key={`${r.entity_type}-${r.entity_id}-${r.doc_type}-${i}`} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{r.entity_label}</div>
                      <div className="text-[11px] uppercase text-slate-500">{r.entity_type}</div>
                    </td>
                    <td className="p-2">{r.doc_label}</td>
                    <td className="p-2 whitespace-nowrap">{dateStr(r.expiry_date)}</td>
                    <td className="p-2 tabular-nums">{r.days_before}</td>
                  </tr>
                ))}
                {!upcoming.length && (
                  <tr>
                    <td colSpan={4} className="p-4 text-slate-500">
                      No expiries in the next 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-btt-navy">Recent runs</div>
          <ul className="text-sm divide-y max-h-96 overflow-auto">
            {runs.map((r) => (
              <li key={r.id} className="p-3">
                <div className="font-medium">
                  {dateStr(r.run_date)} · {r.trigger_source}
                </div>
                <div className="text-xs text-slate-600">
                  candidates {r.candidates} · sent {r.sent} · failed {r.failed} · skipped {r.skipped}
                </div>
                <div className="text-[11px] text-slate-400">{dateTimeStr(r.started_at)}</div>
              </li>
            ))}
            {!runs.length && <li className="p-4 text-slate-500">No runs yet — click Run today.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-btt-navy">Reminder history</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Document</th>
                <th className="p-3">Milestone</th>
                <th className="p-3">To</th>
                <th className="p-3">Status</th>
                <th className="p-3">Preview</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 whitespace-nowrap text-xs">{dateTimeStr(r.sent_at)}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.doc_label}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.entity_type} #{r.entity_id} · exp {dateStr(r.expiry_date)}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    {r.milestone} (D-{r.days_before})
                  </td>
                  <td className="p-3 text-xs">
                    <div className="font-semibold uppercase">{r.recipient_role}</div>
                    <div>{r.recipient_name || "—"}</div>
                    <div className="font-mono">{r.recipient_phone || "—"}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        r.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : r.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.error_message ? (
                      <div className="text-[11px] text-red-700 mt-1 max-w-[160px]">{r.error_message}</div>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs text-slate-600 max-w-sm">{r.message_preview || "—"}</td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-500">
                    No reminders sent yet.
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
