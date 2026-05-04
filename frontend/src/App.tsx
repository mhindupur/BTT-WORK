import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminAccounts from "./pages/AdminAccounts";
import AdminClients from "./pages/AdminClients";
import AdminMis from "./pages/AdminMis";
import ClientHome from "./pages/ClientHome";
import Login from "./pages/Login";
import PublicPay from "./pages/PublicPay";
import VerifyEmail from "./pages/VerifyEmail";
import { getToken } from "./api";

function RequireAuth({ children, role }: { children: ReactElement; role: "admin" | "client" }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  // Role is enforced by API; lightweight guard could decode JWT — omitted for brevity.
  void role;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/pay/:token" element={<PublicPay />} />
      <Route
        path="/admin/clients"
        element={
          <RequireAuth role="admin">
            <AdminClients />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/accounts"
        element={
          <RequireAuth role="admin">
            <AdminAccounts />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/mis"
        element={
          <RequireAuth role="admin">
            <AdminMis />
          </RequireAuth>
        }
      />
      <Route
        path="/client"
        element={
          <RequireAuth role="client">
            <ClientHome />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
