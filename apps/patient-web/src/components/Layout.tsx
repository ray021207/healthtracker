import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, ClipboardList, CalendarCheck, TrendingUp, User, Leaf, LogOut } from "lucide-react";

import { useAuth } from "../lib/auth";

const TABS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/plan", icon: ClipboardList, label: "My Plan" },
  { to: "/track", icon: CalendarCheck, label: "Log" },
  { to: "/progress", icon: TrendingUp, label: "Progress" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="brand">
          <span className="mark">
            <Leaf size={18} strokeWidth={1.5} />
          </span>
          <span className="name">Monark Health</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-secondary font-medium">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            style={{
              width: 36,
              height: 36,
              minHeight: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="app-body page-enter">
        <Outlet />
      </div>

      <nav className="tabbar">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "tab-link active" : "tab-link")}>
            <Icon size={22} strokeWidth={1.5} />
            <span className="lbl">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
