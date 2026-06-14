import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, CheckCircle2 } from "lucide-react";

import { api } from "../lib/api";
import { Alert, Badge, Button, Card, SelectInput, TextInput } from "../components/ui";

interface Credentials { email: string; temporaryPassword: string; firstName: string; lastName: string; dateOfBirth: string; gender: string }

function printCredentials(c: Credentials) {
  const win = window.open("", "_blank", "width=520,height=480");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Patient Credentials</title>
<style>
  body { font-family: Inter, Arial, sans-serif; padding: 40px; color: #1E1A2E; background: #fff; }
  h2 { font-size: 20px; margin-bottom: 4px; color: #5A4F78; }
  .sub { font-size: 13px; color: #6B6580; margin-bottom: 28px; }
  .field { margin-bottom: 14px; }
  .field label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #A8A3B8; display: block; margin-bottom: 3px; }
  .field span { font-size: 15px; font-weight: 600; color: #1E1A2E; }
  .pwd { font-size: 18px; font-weight: 600; color: #5A4F78; background: #EDE9F6; border-radius: 8px; padding: 8px 14px; display: inline-block; letter-spacing: 1px; }
  .notice { margin-top: 28px; font-size: 12px; color: #6B6580; border-top: 1px solid #E4E0EF; padding-top: 16px; line-height: 1.6; }
  .logo { font-size: 13px; font-weight: 600; color: #5A4F78; margin-bottom: 24px; }
</style></head><body>
<div class="logo">Monark Health</div>
<h2>Patient Welcome Card</h2>
<div class="sub">Share this card with the patient at their first visit.</div>
<div class="field"><label>Full Name</label><span>${c.firstName} ${c.lastName}</span></div>
<div class="field"><label>Email / Login</label><span>${c.email}</span></div>
<div class="field"><label>Date of Birth</label><span>${new Date(c.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
<div class="field"><label>Gender</label><span>${c.gender.charAt(0) + c.gender.slice(1).toLowerCase()}</span></div>
<div class="field"><label>Temporary Password</label><div class="pwd">${c.temporaryPassword}</div></div>
<div class="notice">The patient must change this password on first login via the Patient Portal at <strong>localhost:8082</strong>. This card contains confidential information — store or shred securely.</div>
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

const emptyErrors = { email: "", firstName: "", lastName: "" };

export function CreatePatientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", dateOfBirth: "1990-01-01", gender: "MALE" });
  const [errors, setErrors] = useState(emptyErrors);
  const [touched, setTouched] = useState(false);

  const validate = () => {
    const next = {
      email: /^\S+@\S+\.\S+$/.test(form.email) ? "" : "Enter a valid email address",
      firstName: form.firstName.trim() ? "" : "First name is required",
      lastName: form.lastName.trim() ? "" : "Last name is required",
    };
    setErrors(next);
    return !next.email && !next.firstName && !next.lastName;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validate()) return;
    setSubmitError("");
    setSaving(true);
    try {
      const res = await api.createPatient(form);
      // Refresh the cached patient list + dashboard so the new patient shows immediately.
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setCredentials({ ...res.credentials, firstName: form.firstName, lastName: form.lastName, dateOfBirth: form.dateOfBirth, gender: form.gender });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Creation failed");
    } finally {
      setSaving(false);
    }
  };

  if (credentials) {
    return (
      <div className="page-enter">
        <div className="page-toolbar">
          <p className="subtitle">Share the credentials below with the patient</p>
        </div>
        <Card style={{ maxWidth: 520 }}>
          <div
            style={{
              background: "var(--color-primary-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-muted font-medium">New Patient</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 4 }}>
                  {credentials.firstName} {credentials.lastName}
                </div>
              </div>
              <Badge variant="success" leftIcon={<CheckCircle2 size={14} strokeWidth={1.5} />}>Active</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              {[
                ["Email", credentials.email],
                ["Gender", credentials.gender.charAt(0) + credentials.gender.slice(1).toLowerCase()],
                ["Date of Birth", new Date(credentials.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-muted font-medium" style={{ marginBottom: 3 }}>{label}</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{value}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-muted font-medium" style={{ marginBottom: 6 }}>Temporary Password</div>
              <div
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 16px",
                  fontFamily: "monospace",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--color-primary-dark)",
                  letterSpacing: 1,
                }}
              >
                {credentials.temporaryPassword}
              </div>
              <div className="text-xs text-muted mt-2">Patient must change this password on first login.</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button leftIcon={<Printer size={16} strokeWidth={1.5} />} className="flex-1" onClick={() => printCredentials(credentials)}>
              Print Patient Card
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => navigate("/patients")}>
              Back to Patients
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Add a new patient to the clinic</p>
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} strokeWidth={1.5} />} onClick={() => navigate("/patients")}>
          Back
        </Button>
      </div>
      <Card style={{ maxWidth: 520 }}>
        <form onSubmit={onSubmit} noValidate>
          <TextInput
            id="email"
            label="Email"
            type="email"
            placeholder="patient@example.com"
            value={form.email}
            error={touched ? errors.email : ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="grid-2" style={{ marginTop: 16 }}>
            <TextInput
              id="firstName"
              label="First Name"
              placeholder="First name"
              value={form.firstName}
              error={touched ? errors.firstName : ""}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <TextInput
              id="lastName"
              label="Last Name"
              placeholder="Last name"
              value={form.lastName}
              error={touched ? errors.lastName : ""}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <TextInput
              id="dob"
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
            <SelectInput id="gender" label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </SelectInput>
          </div>
          {submitError && <div className="mt-4"><Alert variant="error">{submitError}</Alert></div>}
          <Button type="submit" loading={saving} className="mt-4">
            {saving ? "Creating…" : "Create Patient"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
