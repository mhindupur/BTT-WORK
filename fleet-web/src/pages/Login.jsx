import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";
import api from "../api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState("login"); // login | otp_request | otp_reset
  /** create = first-time password; forgot = reset existing */
  const [passwordSetup, setPasswordSetup] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  function digits10(s) {
    return String(s || "").replace(/\D/g, "").slice(0, 10);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const u = await login(email, password);
      if (u.role === "admin") nav("/admin");
      else nav("/sm");
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || "Login failed");
    }
  }

  async function onRequestOtp(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/auth/request-otp", { phone: digits10(phone) });
      setMsg("If this phone exists for a site manager, an OTP was sent on WhatsApp.");
      setMode("otp_reset");
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || "Request failed");
    }
  }

  async function onResetWithOtp(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/auth/reset-password-with-otp", {
        phone: digits10(phone),
        otp: String(otp || "").replace(/\D/g, "").slice(0, 6),
        new_password: newPassword,
      });
      setMsg("Password saved. Sign in with your email and this password.");
      setMode("login");
      setPasswordSetup(null);
      setOtp("");
      setNewPassword("");
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || "Reset failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-btt-navy">BTT Fleet &amp; Fuel</h1>
        <p className="text-slate-600 text-sm mt-1">Admin or Site Manager sign-in</p>
        {mode === "login" ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong className="text-slate-800">Site managers:</strong> sign in with <strong>email + password</strong>.
              OTP is only used on the next screens. New account? Use <strong>Create password</strong>. Already have an
              account but forgot the password? Use <strong>Forgot password</strong>.
            </div>
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
            {msg && <p className="text-green-700 text-sm">{msg}</p>}
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <button
              type="submit"
              className="w-full bg-btt-navy text-white font-medium py-2.5 rounded-lg hover:bg-btt-accent transition"
            >
              Sign in
            </button>
            <div className="grid gap-2">
              <button
                type="button"
                className="w-full text-sm font-medium py-2.5 rounded-lg border border-btt-navy text-btt-navy hover:bg-slate-50"
                onClick={() => {
                  setPasswordSetup("create");
                  setMode("otp_request");
                }}
              >
                Site manager: Create password
              </button>
              <button
                type="button"
                className="w-full text-sm text-btt-accent font-medium hover:underline"
                onClick={() => {
                  setPasswordSetup("forgot");
                  setMode("otp_request");
                }}
              >
                Site manager: Forgot password?
              </button>
            </div>
          </form>
        ) : mode === "otp_request" ? (
          <form onSubmit={onRequestOtp} className="mt-6 space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              {passwordSetup === "create" ? (
                <>
                  <strong>First-time setup.</strong> Enter the mobile number your admin saved for you. We’ll send an OTP
                  on WhatsApp so you can choose your login password.
                </>
              ) : (
                <>
                  <strong>Reset password.</strong> Enter your registered mobile number. We’ll send an OTP on WhatsApp.
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-slate-300 bg-slate-50 text-slate-700 text-sm">
                  +91
                </span>
                <input
                  className="w-full rounded-r-lg border border-slate-300 px-3 py-2"
                  placeholder="10-digit mobile"
                  value={digits10(phone)}
                  onChange={(e) => setPhone(digits10(e.target.value))}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
            {msg && <p className="text-green-700 text-sm">{msg}</p>}
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 border rounded-lg py-2.5 font-medium"
                onClick={() => {
                  setPasswordSetup(null);
                  setMode("login");
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-btt-navy text-white font-medium py-2.5 rounded-lg hover:bg-btt-accent transition"
              >
                Send OTP
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onResetWithOtp} className="mt-6 space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              {passwordSetup === "create" ? (
                <>
                  Enter the OTP from WhatsApp and <strong>create your login password</strong> (min. 6 characters). Then
                  sign in with your <strong>email</strong> and this password.
                </>
              ) : (
                <>Enter the OTP from WhatsApp and choose a new password.</>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-slate-300 bg-slate-50 text-slate-700 text-sm">
                  +91
                </span>
                <input
                  className="w-full rounded-r-lg border border-slate-300 px-3 py-2"
                  placeholder="10-digit mobile"
                  value={digits10(phone)}
                  onChange={(e) => setPhone(digits10(e.target.value))}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">OTP</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="6-digit OTP"
                value={String(otp || "").replace(/\D/g, "").slice(0, 6)}
                onChange={(e) => setOtp(String(e.target.value || "").replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {passwordSetup === "create" ? "Create password" : "New password"}
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            {msg && <p className="text-green-700 text-sm">{msg}</p>}
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 border rounded-lg py-2.5 font-medium"
                onClick={() => setMode("otp_request")}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-btt-navy text-white font-medium py-2.5 rounded-lg hover:bg-btt-accent transition"
              >
                {passwordSetup === "create" ? "Save password" : "Reset password"}
              </button>
            </div>
          </form>
        )}
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
