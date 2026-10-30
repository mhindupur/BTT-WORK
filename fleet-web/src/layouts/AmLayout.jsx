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
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
    isActive ? "bg-white/15 font-medium text-white shadow-sm" : "text-slate-200/90 hover:bg-white/8 hover:text-white"
  }`;

export default function AmLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="h-[100dvh] min-h-0 flex overflow-hidden">
      <aside className="w-60 bg-btt-navy text-slate-100 flex flex-col shrink-0 h-full">
        <div className="p-3 border-b border-white/10 shrink-0 bg-white">
          <BrandMark variant="compact" />
          <div className="mt-1 text-[11px] font-semibold text-btt-navy/80">Account Manager</div>
        </div>
        <nav className="p-2 flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 p-4 text-xs border-t border-white/10 bg-btt-blueDark">
          <div className="truncate opacity-80">{user?.full_name || user?.email}</div>
          <div className="truncate opacity-60">View only</div>
          <button type="button" onClick={logout} className="mt-2 text-btt-mist hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto min-h-0 min-w-0 bg-btt-soft">
        <Outlet />
      </main>
    </div>
  );
}
