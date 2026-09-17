import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Check } from "lucide-react";

import { useAuth } from "../lib/auth";
import { Alert, Button } from "../components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const emailError = touched && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email address" : null;
  const passwordError = touched && !password.trim() ? "Password is required" : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError || passwordError || !email || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const points = [
    "Your personalised 90-day wellness journey",
    "Daily tracking for meals, workouts & water",
    "Plans and progress in one place",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gradient-auth)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(20px, 4vw, 48px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1040,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 32,
          alignItems: "center",
          animation: "fadeIn 0.3s ease forwards",
        }}
      >
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              color: "var(--color-primary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Leaf size={30} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.8, color: "var(--color-text-primary)", lineHeight: 1.1 }}>
            Monark Health
          </div>
          <div style={{ fontSize: 15, color: "var(--color-text-secondary)", marginTop: 12, maxWidth: 380, lineHeight: 1.6 }}>
            Your wellness companion — built to work smoothly across phones, tablets, and desktops.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 24, maxWidth: 380 }}>
            {points.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: "var(--color-primary-subtle)",
                    color: "var(--color-primary)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Check size={13} strokeWidth={2} />
                </span>
                <span className="text-sm text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            padding: "clamp(24px, 4vw, 32px)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ marginBottom: 20 }}>Sign in to your account</h2>
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className={emailError ? "invalid" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
              />
              {emailError && <div className="field-error">{emailError}</div>}
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={passwordError ? "invalid" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(true)}
              />
              {passwordError && <div className="field-error">{passwordError}</div>}
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" block loading={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginTop: 20 }}>
            By signing in you agree to the{" "}
            <Link to="/terms" style={{ color: "var(--color-text-secondary)" }}>Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" style={{ color: "var(--color-text-secondary)" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
