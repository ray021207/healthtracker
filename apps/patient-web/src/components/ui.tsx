import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} strokeWidth={1.5} style={{ animation: "spin 0.6s linear infinite" }} aria-hidden />;
}

type ButtonVariant = "primary" | "secondary" | "destructive";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  block?: boolean;
  leftIcon?: ReactNode;
}
export function Button({ variant = "primary", loading, block, leftIcon, children, className, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("btn", `btn-${variant}`, block && "btn-block", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
    </button>
  );
}

export function Card({ children, className, style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div className={cx("card", className)} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

type BadgeVariant = "primary" | "success" | "warning" | "error" | "info" | "neutral";
export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: BadgeVariant }) {
  return <span className={cx("badge", `badge-${variant}`)}>{children}</span>;
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <div className="title">{title}</div>
      {subtitle && <div className="subtitle">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ variant = "info", children }: { variant?: "success" | "error" | "info"; children: ReactNode }) {
  return <div className={cx("alert", `alert-${variant}`)}>{children}</div>;
}

export function Skeleton({ height = 16, radius = 10 }: { height?: number; radius?: number }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />;
}

/* Avatar with initials + deterministic lavender tone */
const TONES = ["#EDE9F6", "#E5DDF1", "#DCD0EC", "#D2C3E6", "#E8E2F3"];
function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}
export function Avatar({ firstName = "", lastName = "", size = 40 }: { firstName?: string; lastName?: string; size?: number }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";
  const tone = TONES[hashName(firstName + lastName) % TONES.length];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        background: tone,
        color: "var(--color-primary-dark)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: size * 0.36,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}
