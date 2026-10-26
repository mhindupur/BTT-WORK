import { NavLink, Outlet } from "react-router-dom";
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
    to: "/admin",
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
    to: "/admin/clients",
    label: "Sites",
    icon: (
      <Icon>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-6h6v6" />
      </Icon>
    ),
  },
  {
    to: "/admin/vehicles",
    label: "Vehicles",
    icon: (
      <Icon>
        <path d="M5 17h14v-5l-1.5-4.5A2 2 0 0015.6 6H8.4a2 2 0 00-1.9 1.5L5 12v5z" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="16.5" cy="17.5" r="1.5" />
      </Icon>
    ),
  },
  {
    to: "/admin/vehicle-approvals",
    label: "Vehicle approvals",
    icon: (
      <Icon>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </Icon>
    ),
  },
  {
    to: "/admin/account-managers",
    label: "Account Managers",
    icon: (
      <Icon>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </Icon>
    ),
  },
  {
    to: "/admin/vehicle-types",
    label: "Vehicle types",
    icon: (
      <Icon>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
      </Icon>
    ),
  },
  {
    to: "/admin/indents",
    label: "Indents",
    icon: (
      <Icon>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </Icon>
    ),
  },
  {
    to: "/admin/indent-series",
    label: "Indent series",
    icon: (
      <Icon>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </Icon>
    ),
  },
  {
    to: "/admin/fuel",
    label: "Fuel Recon",
    icon: (
      <Icon>
        <path d="M3 22h12" />
        <path d="M5 22V9l5-5 5 5v13" />
        <path d="M14 11h4l2 3v8" />
        <path d="M9 22v-4" />
      </Icon>
    ),
  },
  {
    to: "/admin/payments",
    label: "Payments",
    icon: (
      <Icon>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h4" />
      </Icon>
    ),
  },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
    isActive ? "bg-white/15 font-medium text-white shadow-sm" : "text-slate-200/90 hover:bg-white/8 hover:text-white"
  }`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="h-[100dvh] min-h-0 flex overflow-hidden">
      <aside className="w-60 bg-btt-navy text-slate-100 flex flex-col shrink-0 h-full">
        <div className="p-4 font-bold border-b border-white/10 tracking-wide shrink-0">BTT Admin</div>
        <nav className="p-2 flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 p-4 text-xs border-t border-white/10 bg-btt-navy">
          <div className="truncate opacity-80">{user?.email}</div>
          <button type="button" onClick={logout} className="mt-2 text-amber-200 hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto min-h-0 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
