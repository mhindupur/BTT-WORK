import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../authContext";

const iconCls = "w-[18px] h-[18px] shrink-0 opacity-90";

function Icon({ children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconCls}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const NAV = [
  {
    to: "/am",
    end: true,
    label: "Dashboard",
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </Icon>
    ),
  },
  {
    to: "/am/sites",
    label: "Sites & Vehicles",
    icon: (
      <Icon>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-6h6v6" />
      </Icon>
    ),
  },
  {
    to: "/am/reports",
    label: "Reports",
    icon: (
      <Icon>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </Icon>
    ),
  },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition whitespace-nowrap ${
    isActive ? "bg-white/15 font-medium text-white shadow-sm" : "text-slate-200/90 hover:bg-white/8 hover:text-white"
  }`;

export default function AmLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="h-[100dvh] min-h-0 flex flex-col md:flex-row overflow-hidden">
      <aside className="w-full md:w-60 bg-btt-navy text-slate-100 flex flex-col md:shrink-0 md:h-full border-b md:border-b-0">
        <div className="p-3 border-b border-white/10 shrink-0 bg-white flex items-center justify-between gap-2">
          <div className="min-w-0">
            <BrandMark variant="compact" />
            <div className="mt-1 text-[11px] font-semibold text-btt-navy/80">Account Manager</div>
          </div>
          <button
            type="button"
            className="md:hidden px-3 py-1.5 rounded-lg border text-xs font-semibold text-btt-navy"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
        <nav
          className={`${menuOpen ? "flex" : "hidden"} md:flex p-2 flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:flex-1 min-h-0`}
          onClick={() => setMenuOpen(false)}
        >
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block shrink-0 p-4 text-xs border-t border-white/10 bg-btt-blueDark">
          <div className="truncate opacity-80">{user?.full_name || user?.email}</div>
          <div className="truncate opacity-60">View only</div>
          <button type="button" onClick={logout} className="mt-2 text-btt-mist hover:underline">
            Log out
          </button>
        </div>
        <div className="md:hidden shrink-0 px-3 py-2 text-xs border-t border-white/10 flex items-center justify-between gap-2">
          <span className="truncate opacity-80">{user?.full_name || user?.email}</span>
          <button type="button" onClick={logout} className="text-btt-mist underline shrink-0">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 overflow-auto min-h-0 min-w-0 bg-btt-soft">
        <Outlet />
      </main>
    </div>
  );
}
