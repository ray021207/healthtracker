import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import { markDemoCredentialsChanged, useAuth } from "../lib/auth";
import { Alert, Avatar, Badge, Button, Card, TextInput } from "../components/ui";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const newPwError =
    touched && form.newPassword.length > 0 && form.newPassword.length < 12
      ? "Must be at least 12 characters"
      : null;
  const confirmError =
    touched && form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword
      ? "Passwords do not match"
      : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setStatus("");
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (form.newPassword.length < 12) {
      setError("New password must be at least 12 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await api.changePassword(form.currentPassword, form.newPassword);
      markDemoCredentialsChanged();
      setStatus(res.message + " Signing out…");
      setTimeout(async () => {
        await logout();
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Manage your admin account preferences</p>
      </div>

      {user && (
        <Card className="mb-4" style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-4">
            <Avatar firstName={user.firstName} lastName={user.lastName} size={56} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-secondary mt-1">{user.email}</div>
              <div className="mt-2">
                <Badge variant="primary">Admin</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ maxWidth: 520 }}>
        <div className="card-header"><h2>Change Password</h2></div>
        <form onSubmit={onSubmit} noValidate>
          <TextInput
            id="currentPassword"
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <div style={{ marginTop: 16 }}>
            <TextInput
              id="newPassword"
              label="New Password"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              error={newPwError}
              hint="Minimum 12 characters"
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              error={confirmError}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>
          {status && <div className="mt-4"><Alert variant="success">{status}</Alert></div>}
          {error && <div className="mt-4"><Alert variant="error">{error}</Alert></div>}
          <Button type="submit" loading={saving} className="mt-4">
            {saving ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </Card>

      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 20 }}>
        <Link to="/terms" style={{ color: "inherit" }}>Terms of Service</Link>
        {" · "}
        <Link to="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
      </p>
    </div>
  );
}
