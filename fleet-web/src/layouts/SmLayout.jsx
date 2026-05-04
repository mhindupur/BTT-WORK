import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../authContext";

const linkCls = ({ isActive }) =>
  `shrink-0 whitespace-nowrap block px-3 py-2.5 md:py-2 rounded-lg text-sm min-h-[44px] md:min-h-0 flex items-center justify-center md:justify-start ${
    isActive ? "bg-white/15 font-medium" : "hover:bg-white/10 active:bg-white/20"
  }`;

export default function SmLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col md:flex-row bg-slate-50 md:bg-white">
      <aside className="w-full md:w-56 bg-btt-accent text-white flex flex-col md:shrink-0 md:min-h-screen border-b md:border-b-0 md:border-r border-white/10 shadow-sm md:shadow-none">
        <div className="px-3 py-3 md:p-4 font-bold border-b border-white/10 flex items-center justify-between gap-2 min-h-[52px]">
          <span className="text-base md:text-lg">Site Manager</span>
          <span className="md:hidden text-xs font-normal opacity-90 truncate max-w-[45%]" title={user?.full_name}>
            {user?.full_name}
          </span>
        </div>
        <nav className="p-2 flex flex-row md:flex-col gap-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <NavLink to="/sm" end className={linkCls}>
            Home
          </NavLink>
          <NavLink to="/sm/issue-indent" className={linkCls}>
            Issue Indent
          </NavLink>
          <NavLink to="/sm/my-indents" className={linkCls}>
            My Indents
          </NavLink>
        </nav>
        <div className="mt-auto hidden md:block p-4 text-xs border-t border-white/10">
          <div className="truncate opacity-90">{user?.full_name}</div>
          <button type="button" onClick={logout} className="mt-2 text-amber-200 hover:underline text-left w-full py-1">
            Log out
          </button>
        </div>
        <div className="md:hidden px-2 py-2 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="text-amber-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-white/10 min-h-[44px]"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-5 md:p-6 overflow-x-hidden overflow-y-auto min-w-0 w-full max-w-[100vw]">
        <Outlet />
      </main>
    </div>
  );
}
