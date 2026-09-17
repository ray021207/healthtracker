import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";

import { hasChangedDemoCredentials, useAuth } from "../lib/auth";
import { Alert, Button, TextInput } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const demoCredentialsAvailable = !hasChangedDemoCredentials();
  const [email, setEmail] = useState(demoCredentialsAvailable ? "admin@monarkhealth.com" : "");
  const [password, setPassword] = useState(demoCredentialsAvailable ? "Admin@12345" : "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError = touched && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email address" : null;
  const passwordError = touched && password.length === 0 ? "Password is required" : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError || passwordError || !email || !password) return;
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--gradient-auth)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary-subtle)",
              color: "var(--color-primary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Leaf size={26} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: 24 }}>Monark Health Admin</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 6 }}>
            Practitioner &amp; clinic management
          </p>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            padding: 32,
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Sign in to your account</h2>
          <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TextInput
              id="email"
              label="Email Address"
              type="email"
              autoComplete="username"
              value={email}
              error={emailError}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            <TextInput
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              error={passwordError}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" loading={loading} className="w-full" style={{ marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          {demoCredentialsAvailable && (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginTop: 18 }}>
              Demo credentials pre-filled
            </p>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginTop: 20 }}>
          By signing in you agree to the{" "}
          <Link to="/terms" style={{ color: "var(--color-text-secondary)" }}>Terms of Service</Link>{" "}
          and{" "}
          <Link to="/privacy" style={{ color: "var(--color-text-secondary)" }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
