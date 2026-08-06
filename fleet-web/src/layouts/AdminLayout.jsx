import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../authContext";

const linkCls = ({ isActive }) =>
  `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-white/10 font-medium" : "hover:bg-white/5"}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-btt-navy text-slate-100 flex flex-col shrink-0">
        <div className="p-4 font-bold border-b border-white/10">BTT Admin</div>
        <nav className="p-2 flex flex-col gap-0.5">
          <NavLink to="/admin" end className={linkCls}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/clients" className={linkCls}>
            Clients
          </NavLink>
          <NavLink to="/admin/site-managers" className={linkCls}>
            Site Managers
          </NavLink>
          <NavLink to="/admin/vehicles" className={linkCls}>
            Vehicles
          </NavLink>
          <NavLink to="/admin/vehicle-types" className={linkCls}>
            Vehicle types
          </NavLink>
          <NavLink to="/admin/vehicle-approvals" className={linkCls}>
            Vehicle approvals
          </NavLink>
          <NavLink to="/admin/indents" className={linkCls}>
            Indents
          </NavLink>
          <NavLink to="/admin/indent-series" className={linkCls}>
            Indent series
          </NavLink>
          <NavLink to="/admin/fuel" className={linkCls}>
            Fuel Recon
          </NavLink>
          <NavLink to="/admin/payments" className={linkCls}>
            Payments
          </NavLink>
        </nav>
        <div className="mt-auto p-4 text-xs border-t border-white/10">
          <div className="truncate opacity-80">{user?.email}</div>
          <button type="button" onClick={logout} className="mt-2 text-amber-200 hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
