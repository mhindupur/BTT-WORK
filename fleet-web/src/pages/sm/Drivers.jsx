import { useEffect, useState } from "react";
import api from "../../api";

const emptyForm = () => ({
  full_name: "",
  phone: "",
  license_number: "",
  license_expiry: "",
  vehicle_id: "",
  notes: "",
});

export default function SmDrivers() {
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [uploadFor, setUploadFor] = useState(null);
  const [uploadExpiry, setUploadExpiry] = useState("");

  async function load() {
    const [d, v] = await Promise.all([api.get("/sm/drivers/mine"), api.get("/sm/vehicles/mine")]);
    setRows(d.data);
    setVehicles((v.data || []).filter((x) => x.approval_status === "approved"));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/sm/drivers", {
        ...form,
        vehicle_id: form.vehicle_id === "" ? null : Number(form.vehicle_id),
        license_expiry: form.license_expiry || null,
      });
      setForm(emptyForm());
      setShowAdd(false);
      setMsg("Driver saved.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  async function uploadLicense(e) {
    e.preventDefault();
    if (!uploadFor) return;
    const file = e.target.file?.files?.[0];
    if (!file) return setErr("Choose a DL file");
    if (!uploadExpiry) return setErr("Select new license expiry");
    setErr("");
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("license_expiry", uploadExpiry);
    try {
      await api.post(`/sm/drivers/${uploadFor}/license-document`, fd);
      setUploadFor(null);
      setUploadExpiry("");
      setMsg("Driving license uploaded — waiting for admin approval.");
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-btt-navy">Drivers</h1>
          <p className="text-sm text-slate-600 mt-1">
            Keep driver WhatsApp and DL expiry updated. Renewed DL must be uploaded for admin approval before
            reminders stop.
          </p>
        </div>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            showAdd ? "border border-slate-300 bg-white" : "bg-btt-navy text-white"
          }`}
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? "Hide" : "Add driver"}
        </button>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">{msg}</div>}

      {showAdd && (
        <form onSubmit={create} className="bg-white rounded-2xl border p-4 grid sm:grid-cols-2 gap-3">
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Full name *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="WhatsApp mobile"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="border rounded-xl px-3 py-2 font-mono uppercase"
            placeholder="DL number"
            value={form.license_number}
            onChange={(e) => setForm({ ...form, license_number: e.target.value.toUpperCase() })}
          />
          <input
            type="date"
            className="border rounded-xl px-3 py-2"
            value={form.license_expiry}
            onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
          />
          <select
            className="border rounded-xl px-3 py-2 sm:col-span-2"
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          >
            <option value="">Linked vehicle (optional)</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number}
              </option>
            ))}
          </select>
          <button type="submit" className="sm:col-span-2 bg-btt-navy text-white rounded-xl py-2.5 font-semibold">
            Save driver
          </button>
        </form>
      )}

      {uploadFor && (
        <form onSubmit={uploadLicense} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="font-semibold text-amber-950">Upload renewed driving license</div>
          <input type="file" name="file" accept="image/*,.pdf" required className="block w-full text-sm" />
          <label className="block text-sm">
            New DL expiry *
            <input
              type="date"
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={uploadExpiry}
              onChange={(e) => setUploadExpiry(e.target.value)}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-btt-navy text-white rounded-xl px-4 py-2 text-sm font-semibold">
              Submit for approval
            </button>
            <button type="button" className="border rounded-xl px-4 py-2 text-sm" onClick={() => setUploadFor(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="p-4 flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-bold text-btt-navy">{r.full_name}</div>
                <div className="text-sm text-slate-600">
                  {r.phone || "No phone"} · DL {r.license_number || "—"} · exp{" "}
                  {r.license_expiry ? String(r.license_expiry).slice(0, 10) : "—"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {r.vehicle_registration || "No vehicle linked"} · doc {r.license_doc_status}
                </div>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-btt-navy hover:underline"
                onClick={() => {
                  setUploadFor(r.id);
                  setUploadExpiry(r.license_expiry ? String(r.license_expiry).slice(0, 10) : "");
                }}
              >
                Upload renewed DL
              </button>
            </li>
          ))}
          {!rows.length && <li className="p-4 text-slate-500">No drivers yet.</li>}
        </ul>
      </div>
    </div>
  );
}
