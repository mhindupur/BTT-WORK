import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const initial = useMemo(() => params.get("token") ?? "", [params]);
  const [token, setToken] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const r = await api<{ message: string }>("/auth/verify-email", { method: "POST", json: { token } });
      setMsg(r.message);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Verification failed");
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "2rem auto" }}>
      <h2 style={{ marginTop: 0 }}>Verify email</h2>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Token from invitation email</label>
          <textarea rows={3} value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>
        <button className="primary" type="submit">
          Verify
        </button>
      </form>
      {msg && <p style={{ color: "#15803d" }}>{msg}</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
    </div>
  );
}
