import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api<{
        access_token: string;
        role: string;
        password_must_change: boolean;
        email_verified: boolean;
      }>("/auth/login", { method: "POST", json: { email, password } });
      setToken(res.access_token);
      if (res.role === "admin") {
        nav("/admin/clients");
        return;
      }
      if (res.password_must_change) {
        const np = window.prompt("Set a new password (min 8 characters)");
        if (np && np.length >= 8) {
          await api("/auth/change-temporary-password", { method: "POST", json: { new_password: np } });
        }
      }
      if (!res.email_verified) {
        nav("/verify-email");
        return;
      }
      nav("/client");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "3rem auto" }}>
      <h1 style={{ marginTop: 0 }}>Basaveshwara Tours and Travels</h1>
      <p style={{ color: "#475569", fontSize: "0.95rem" }}>
        Sign in as admin (default dev: <code>admin@btt.local</code> / <code>Admin@123</code>) or client.
      </p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
        <a href="/verify-email">Verify email</a> (paste token on that page)
      </p>
    </div>
  );
}
