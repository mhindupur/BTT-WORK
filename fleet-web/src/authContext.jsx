import { createContext, useContext, useMemo, useState, useEffect } from "react";
import api from "./api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("fleet_token");
    if (!t) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem("fleet_token");
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.otp_required && data.admin_login_pending) {
      return data; // caller must complete OTP; do not store token yet
    }
    localStorage.setItem("fleet_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const completeAdminOtp = async (userId, otp) => {
    const { data } = await api.post("/auth/verify-admin-otp", { user_id: userId, otp });
    localStorage.setItem("fleet_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("fleet_token");
    setUser(null);
  };

  const v = useMemo(
    () => ({ user, ready, login, logout, completeAdminOtp }),
    [user, ready]
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
