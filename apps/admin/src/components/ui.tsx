import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

/* Tiny classname joiner */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ====================================================================
   Spinner
   ==================================================================== */
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} strokeWidth={1.5} style={{ animation: "spin 0.6s linear infinite" }} aria-hidden />;
}

/* ====================================================================
   Button
   ==================================================================== */
type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  leftIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : leftIcon}
      {children}
    </button>
  );
}

/* ====================================================================
   Card
   ==================================================================== */
export function Card({
  children,
  flush = false,
  className,
  style,
}: {
  children: ReactNode;
  flush?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cx("card", flush && "flush", className)} style={style}>
      {children}
    </div>
  );
}

/* ====================================================================
   Badge
   ==================================================================== */
type BadgeVariant = "primary" | "success" | "warning" | "error" | "info" | "neutral";
export function Badge({
  children,
  variant = "neutral",
  leftIcon,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  leftIcon?: ReactNode;
}) {
  return (
    <span className={cx("badge", `badge-${variant}`)}>
      {leftIcon}
      {children}
    </span>
  );
}

/* ====================================================================
   Avatar — initials with a deterministic lavender tone from the name
   ==================================================================== */
const AVATAR_TONES = [
  "var(--color-avatar-1)",
  "var(--color-avatar-2)",
  "var(--color-avatar-3)",
  "var(--color-avatar-4)",
  "var(--color-avatar-5)",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({
  firstName = "",
  lastName = "",
  size = 38,
}: {
  firstName?: string;
  lastName?: string;
  size?: number;
}) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";
  const tone = AVATAR_TONES[hashName(firstName + lastName) % AVATAR_TONES.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

/* ====================================================================
   Form field — label + input/select + inline validation
   ==================================================================== */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label?: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
}
export function TextInput({ label, error, hint, id, className, ...rest }: TextInputProps) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <input id={id} className={cx(error && "invalid", className)} {...rest} />
    </Field>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}
export function SelectInput({ label, error, hint, id, className, children, ...rest }: SelectInputProps) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <select id={id} className={cx(error && "invalid", className)} {...rest}>
        {children}
      </select>
    </Field>
  );
}

/* ====================================================================
   Stat / metric card
   ==================================================================== */
export function StatCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="stat-card">
      <div className="icon-box">{icon}</div>
      <div>
        <div className="value">{value}</div>
        <div className="label">{label}</div>
      </div>
    </div>
  );
}

/* ====================================================================
   Empty state
   ==================================================================== */
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <div className="title">{title}</div>
      {subtitle && <div className="subtitle">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ====================================================================
   Modal
   ==================================================================== */
export function Modal({
  open,
  onClose,
  children,
  maxWidth = 480,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ====================================================================
   Inline alert (success / error / info)
   ==================================================================== */
export function Alert({
  variant = "info",
  children,
}: {
  variant?: "success" | "error" | "info" | "warning";
  children: ReactNode;
}) {
  const map = {
    success: { bg: "var(--color-success-subtle)", color: "var(--color-success)" },
    error: { bg: "var(--color-error-subtle)", color: "var(--color-error)" },
    info: { bg: "var(--color-info-subtle)", color: "var(--color-info-text)" },
    warning: { bg: "var(--color-warning-subtle)", color: "var(--color-warning-text)" },
  }[variant];
  return (
    <div
      style={{
        background: map.bg,
        color: map.color,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

/* ====================================================================
   Skeleton block
   ==================================================================== */
export function Skeleton({ width = "100%", height = 16, radius = 6 }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius }} />;
}
