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
    to: "/sm",
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
    to: "/sm/vehicles",
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
    to: "/sm/drivers",
    label: "Drivers",
    icon: (
      <Icon>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </Icon>
    ),
  },
  {
    to: "/sm/issue-indent",
    label: "Issue Indent",
    icon: (
      <Icon>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </Icon>
    ),
  },
  {
    to: "/sm/my-indents",
    label: "My Indents",
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
];

const linkCls = ({ isActive }) =>
  `shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm min-h-[44px] md:min-h-0 justify-center md:justify-start transition ${
    isActive
      ? "bg-white/15 font-medium text-white shadow-sm"
      : "text-white/90 hover:bg-white/10 hover:text-white active:bg-white/20"
  }`;

export default function SmLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="h-[100dvh] min-h-0 flex flex-col md:flex-row bg-slate-50 md:bg-white overflow-hidden">
      <aside className="w-full md:w-60 bg-btt-greenDark text-white flex flex-col md:shrink-0 md:h-full border-b md:border-b-0 md:border-r border-white/10 shadow-sm md:shadow-none">
        <div className="px-3 py-2 md:p-3 border-b border-white/10 flex items-center justify-between gap-2 min-h-[52px] shrink-0 bg-white">
          <div className="min-w-0">
            <BrandMark variant="compact" />
            <div className="text-[11px] font-semibold text-btt-greenDark">Site Manager</div>
          </div>
          <span className="md:hidden text-xs font-normal text-slate-600 truncate max-w-[40%]" title={user?.full_name}>
            {user?.full_name}
          </span>
        </div>
        <nav className="p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:flex-1 overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block shrink-0 p-4 text-xs border-t border-white/10 bg-btt-greenDark">
          <div className="truncate opacity-90 font-medium">{user?.full_name}</div>
          <div className="truncate opacity-70 mt-0.5">{user?.email}</div>
          <button type="button" onClick={logout} className="mt-2 text-btt-mist hover:underline text-left w-full py-1">
            Log out
          </button>
        </div>
        <div className="md:hidden shrink-0 px-2 py-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="min-w-0 text-xs opacity-90 truncate">{user?.email}</div>
          <button
            type="button"
            onClick={logout}
            className="text-amber-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-white/10 min-h-[44px] shrink-0"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-5 md:p-6 overflow-x-hidden overflow-y-auto min-w-0 min-h-0 w-full max-w-[100vw]">
        <Outlet />
      </main>
    </div>
  );
}
