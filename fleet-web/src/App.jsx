import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./authContext";
import Login from "./pages/Login";
import PublicPayment from "./pages/PublicPayment";
import AdminLayout from "./layouts/AdminLayout";
import SmLayout from "./layouts/SmLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminSiteManagers from "./pages/admin/SiteManagers";
import AdminVehicles from "./pages/admin/Vehicles";
import AdminIndents from "./pages/admin/Indents";
import AdminFuel from "./pages/admin/Fuel";
import AdminPayments from "./pages/admin/Payments";
import SmDashboard from "./pages/sm/SmDashboard";
import IssueIndent from "./pages/sm/IssueIndent";
import MyIndents from "./pages/sm/MyIndents";

function Guard({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-8 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pay/:token" element={<PublicPayment />} />
      <Route
        path="/admin"
        element={
          <Guard role="admin">
            <AdminLayout />
          </Guard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="site-managers" element={<AdminSiteManagers />} />
        <Route path="vehicles" element={<AdminVehicles />} />
        <Route path="indents" element={<AdminIndents />} />
        <Route path="fuel" element={<AdminFuel />} />
        <Route path="payments" element={<AdminPayments />} />
      </Route>
      <Route
        path="/sm"
        element={
          <Guard role="site_manager">
            <SmLayout />
          </Guard>
        }
      >
        <Route index element={<SmDashboard />} />
        <Route path="issue-indent" element={<IssueIndent />} />
        <Route path="my-indents" element={<MyIndents />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
