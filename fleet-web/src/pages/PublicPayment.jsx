import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function PublicPayment() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [viewedMsg, setViewedMsg] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    axios
      .get(`/api/public/payments/${token}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, [token]);

  useEffect(() => {
    if (!data || data.already_viewed) return;
    axios.post(`/api/public/payments/${token}/viewed`).then((r) => {
      setViewedMsg(r.data.message);
    });
  }, [data, token]);

  async function sendQuery(e) {
    e.preventDefault();
    if (!query.trim()) return;
    await axios.post(`/api/public/payments/${token}/query`, { message: query });
    setQuery("");
    alert("Query submitted to accounts team.");
  }

  if (err) return <div className="p-8 text-center text-red-600">{err}</div>;
  if (!data) return <div className="p-8 text-center text-slate-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-xl font-bold text-btt-navy">BTT — Payment details</h1>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Vehicle</dt>
            <dd className="font-mono font-medium">{data.vehicle_registration}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Owner</dt>
            <dd>{data.owner_name || "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Period</dt>
            <dd>{data.period_label || "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">No. of trips</dt>
            <dd>{data.trip_count ?? "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Fuel advance</dt>
            <dd>₹{data.fuel_advance_rs ?? "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Other deductions</dt>
            <dd>₹{data.other_deductions_rs ?? "—"}</dd>
          </div>
          <div className="flex justify-between pt-1">
            <dt className="font-semibold">Total paid</dt>
            <dd className="font-bold text-lg text-btt-navy">₹{data.total_paid_rs ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
          {viewedMsg || "Payment Received. This page has been viewed and recorded."}
        </p>
        <form onSubmit={sendQuery} className="mt-6 space-y-2">
          <label className="block text-sm font-medium text-slate-700">Raise a query</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Message to accounts team"
          />
          <button type="submit" className="bg-btt-navy text-white text-sm py-2 px-4 rounded-lg">
            Submit query
          </button>
        </form>
      </div>
    </div>
  );
}
