import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(email, password);
      if (u.role === "admin") nav("/admin");
      else nav("/sm");
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-btt-navy">BTT Fleet &amp; Fuel</h1>
        <p className="text-slate-600 text-sm mt-1">Admin or Site Manager sign-in</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button
            type="submit"
            className="w-full bg-btt-navy text-white font-medium py-2.5 rounded-lg hover:bg-btt-accent transition"
          >
            Sign in
          </button>
        </form>
        <div className="text-xs text-slate-500 mt-4 space-y-1 rounded-lg bg-slate-50 p-3 border border-slate-100">
          <div>
            <span className="font-medium text-slate-600">Admin</span> —{" "}
            <code className="text-slate-800">admin@btt.fleet</code> /{" "}
            <code className="text-slate-800">Admin@123</code>
          </div>
          <div>
            <span className="font-medium text-slate-600">Supervisor / Site manager</span> —{" "}
            <code className="text-slate-800">supervisor@btt.fleet</code> /{" "}
            <code className="text-slate-800">Supervisor@123</code>
          </div>
          <p className="text-slate-400 pt-1">Run <code className="text-slate-600">npm run seed</code> in{" "}
            <code className="text-slate-600">fleet-api</code> after applying SQL.</p>
        </div>
      </div>
    </div>
  );
}
