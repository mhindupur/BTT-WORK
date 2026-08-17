import { useEffect, useRef, useState } from "react";
import api from "../../api";

export default function IssueIndent() {
  const [vehicles, setVehicles] = useState([]);
  const [serials, setSerials] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [history, setHistory] = useState(null);
  const [serial, setSerial] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [serialsLoadErr, setSerialsLoadErr] = useState("");
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    api
      .get("/sm/vehicles/mine", { params: { for_work: 1 } })
      .then((r) => setVehicles(r.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    api
      .get("/sm/indents/available-serials")
      .then((r) => {
        setSerialsLoadErr("");
        setSerials(r.data);
        if (r.data.length && !serial) setSerial(r.data[0].serial_number);
      })
      .catch((ex) => {
        const d = ex.response?.data;
        setSerialsLoadErr(d?.error || d?.message || ex.message || "Could not load serial numbers.");
      });
  }, []);

  useEffect(() => {
    if (!vehicleId) {
      setHistory(null);
      return;
    }
    api
      .get(`/sm/vehicles/${vehicleId}/indent-history`)
      .then((r) => setHistory(r.data))
      .catch(() => setHistory(null));
  }, [vehicleId]);

  function onPhotoSelected(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }

  function clearPhotoInputs() {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function refreshSerials() {
    const { data } = await api.get("/sm/indents/available-serials");
    setSerials(data);
    if (data.length && !data.some((s) => s.serial_number === serial)) {
      setSerial(data[0].serial_number);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!file) {
      setErr("Please add a photo from gallery or camera.");
      return;
    }
    const fd = new FormData();
    fd.append("serial_number", serial);
    fd.append("vehicle_id", vehicleId);
    fd.append("amount_rs", amount);
    fd.append("photo", file);
    try {
      await api.post("/sm/indents", fd);
      setMsg("Indent submitted.");
      setAmount("");
      setFile(null);
      clearPhotoInputs();
      await refreshSerials();
      if (vehicleId) {
        const r = await api.get(`/sm/vehicles/${vehicleId}/indent-history`);
        setHistory(r.data);
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  }

  const previewUrl = file ? URL.createObjectURL(file) : null;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-btt-navy leading-tight">Issue advance indent</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        Use a serial number from the list your <strong>admin issued</strong> to you. You cannot type a random
        serial.
      </p>
      {serialsLoadErr && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {serialsLoadErr}
        </div>
      )}
      {serials.length === 0 && !serialsLoadErr && (
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          No available serials in your pool. Ask an admin to assign a series (e.g. CBL0001–CBL0100) under{" "}
          <strong>Admin → Indent series</strong>.
        </div>
      )}
      <form
        onSubmit={submit}
        className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-3 sm:py-2 text-base sm:text-sm min-h-[48px] sm:min-h-0"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} — {v.client_name}
              </option>
            ))}
          </select>
        </div>
        {history && (
          <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm -mx-1 sm:mx-0">
            <div className="font-semibold text-amber-900 mb-2">Vehicle indent history (last 30 days)</div>
            <p className="text-amber-800 mb-2 text-xs sm:text-sm">
              {history.summary.cnt} indent(s), total ₹{history.summary.total_rs} (all site managers)
            </p>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs min-w-[320px]">
                <thead>
                  <tr className="text-left text-amber-900">
                    <th className="pr-2 py-1">Serial</th>
                    <th className="pr-2 py-1">By</th>
                    <th className="pr-2 py-1">Date</th>
                    <th className="pr-2 py-1">Amt</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.indents.map((i) => (
                    <tr key={i.id} className="border-t border-amber-100">
                      <td className="py-1.5 font-mono whitespace-nowrap">{i.serial_number}</td>
                      <td className="py-1.5 max-w-[5rem] truncate">{i.issued_by_name}</td>
                      <td className="py-1.5 whitespace-nowrap">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="py-1.5 whitespace-nowrap">₹{i.amount_rs}</td>
                      <td className="py-1.5">{i.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Admin-issued serial *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-3 sm:py-2 font-mono text-base sm:text-sm min-h-[48px] sm:min-h-0"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            required
            disabled={serials.length === 0}
          >
            {serials.length === 0 ? (
              <option value="">No serials available</option>
            ) : (
              serials.map((s) => (
                <option key={s.id} value={s.serial_number}>
                  {s.serial_number}
                  {s.batch_description ? ` — ${s.batch_description}` : ""}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Advance amount (Rs) *</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            className="mt-1 w-full border rounded-lg px-3 py-3 sm:py-2 text-base sm:text-sm min-h-[48px] sm:min-h-0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Indent photo *</label>
          <p className="text-xs text-slate-500 mb-3">
            Choose an existing image or use the camera on your phone. JPEG, PNG, or WebP.
          </p>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onPhotoSelected}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onPhotoSelected}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 border-2 border-slate-200 bg-slate-50 text-btt-navy font-medium py-3 px-4 rounded-xl min-h-[48px] hover:bg-slate-100 active:bg-slate-200"
            >
              Choose file
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 border-2 border-btt-accent/40 bg-btt-accent/10 text-btt-navy font-medium py-3 px-4 rounded-xl min-h-[48px] hover:bg-btt-accent/20 active:bg-btt-accent/25"
            >
              Take photo
            </button>
          </div>
          {file && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Indent preview"
                  className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-lg border border-slate-200"
                />
              )}
              <div className="text-sm text-slate-700 min-w-0">
                <div className="font-medium truncate" title={file.name}>
                  {file.name || "Captured image"}
                </div>
                <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</div>
                <button
                  type="button"
                  className="mt-2 text-sm text-red-600 hover:underline"
                  onClick={() => {
                    setFile(null);
                    clearPhotoInputs();
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        <button
          type="submit"
          className="w-full sm:w-auto bg-btt-accent text-white font-medium py-3.5 sm:py-2.5 px-6 rounded-xl sm:rounded-lg min-h-[48px] disabled:opacity-50"
          disabled={serials.length === 0}
        >
          Submit indent
        </button>
      </form>
    </div>
  );
}
