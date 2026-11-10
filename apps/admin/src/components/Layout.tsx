import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Sparkles,
  FileText,
  TrendingUp,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";

import { useAuth } from "../lib/auth";
import { Avatar } from "./ui";

const ICON_PROPS = { size: 20, strokeWidth: 1.5 } as const;

const NAV_LINKS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/patients/create", icon: UserPlus, label: "Create Patient" },
  { to: "/plans/generate", icon: Sparkles, label: "Generate Plan" },
  { to: "/plans/view", icon: FileText, label: "View Plan" },
  { to: "/progress/view", icon: TrendingUp, label: "View Progress" },
  { to: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

/* Resolve the top-bar title from the current path. HIPAA: never put
   patient PII (names/ids) in the title — use generic section labels. */
const TITLE_RULES: Array<[RegExp, string]> = [
  [/^\/dashboard/, "Dashboard"],
  [/^\/patients\/create/, "Create Patient"],
  [/^\/patients\/[^/]+\/health-profile/, "Clinical Profile"],
  [/^\/patients\/[^/]+\/progress/, "Patient Progress"],
  [/^\/patients\/[^/]+$/, "Patient Detail"],
  [/^\/patients/, "Patients"],
  [/^\/plans\/generate/, "Generate Plan"],
  [/^\/plans\/view/, "Wellness Plan"],
  [/^\/progress\/view/, "View Progress"],
  [/^\/audit-logs/, "Audit Logs"],
  [/^\/settings/, "Settings"],
];

function titleForPath(path: string): string {
  return TITLE_RULES.find(([re]) => re.test(path))?.[1] ?? "HECOS";
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="mark">
            <img src="/hecos-logo.svg" alt="HECOS logo" width={36} height={36} style={{ display: "block" }} />
          </span>
          <span className="name">HECOS</span>
        </div>

        <nav className="sidebar-nav">
          <div className="group-label">Navigation</div>
          {NAV_LINKS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/patients"}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon {...ICON_PROPS} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="btn btn-ghost w-full" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={1.5} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{titleForPath(pathname)}</div>
          {user && (
            <div className="topbar-user">
              <div className="meta">
                <div className="nm">
                  {user.firstName} {user.lastName}
                </div>
                <div className="rl">Admin</div>
              </div>
              <Avatar firstName={user.firstName} lastName={user.lastName} size={36} />
            </div>
          )}
        </header>

        <main className="page page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
