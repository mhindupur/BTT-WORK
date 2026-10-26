import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../authContext";

const linkCls = ({ isActive }) =>
  `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-white/10 font-medium" : "hover:bg-white/5"}`;

export default function AmLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-btt-navy text-slate-100 flex flex-col shrink-0">
        <div className="p-4 font-bold border-b border-white/10">BTT Account Manager</div>
        <nav className="p-2 flex flex-col gap-0.5">
          <NavLink to="/am" end className={linkCls}>
            Dashboard
          </NavLink>
          <NavLink to="/am/sites" className={linkCls}>
            Sites &amp; Vehicles
          </NavLink>
        </nav>
        <div className="mt-auto p-4 text-xs border-t border-white/10">
          <div className="truncate opacity-80">{user?.full_name || user?.email}</div>
          <div className="truncate opacity-60">View only</div>
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
