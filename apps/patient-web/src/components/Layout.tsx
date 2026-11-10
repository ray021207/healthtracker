import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, ClipboardList, CalendarCheck, TrendingUp, User, LogOut, Sparkles, X } from "lucide-react";

import { useAuth } from "../lib/auth";
import { usePlanGeneration } from "../lib/planGeneration";

const TABS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/plan", icon: ClipboardList, label: "My Plan" },
  { to: "/track", icon: CalendarCheck, label: "Log" },
  { to: "/progress", icon: TrendingUp, label: "Progress" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { generating, status, error, dismiss } = usePlanGeneration();
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ProfilePage already shows this same status inline, so the global banner
  // only needs to appear elsewhere — it's what lets generation keep running
  // (and stay visible) while the patient explores other tabs.
  const showBanner = (generating || status || error) && location.pathname !== "/profile";

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="brand">
          <span className="mark">
            <img src="/hecos-logo.svg" alt="HECOS logo" width={36} height={36} style={{ display: "block" }} />
          </span>
          <span className="name">HECOS</span>
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

      {showBanner && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: generating
              ? "var(--color-info-subtle)"
              : error
                ? "var(--color-error-subtle)"
                : "var(--color-success-subtle)",
            color: generating ? "var(--color-info-text)" : error ? "var(--color-error)" : "var(--color-success)",
          }}
        >
          <Sparkles size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{generating ? "Generating your 90-day plan…" : (error ?? status)}</span>
          {!generating && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", padding: 2 }}
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}

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
