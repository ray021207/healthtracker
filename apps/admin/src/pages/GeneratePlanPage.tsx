import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, CalendarRange, Apple, Dumbbell, Leaf, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { api } from "../lib/api";
import { Alert, Avatar, Button, Card, SelectInput } from "../components/ui";

const STEPS = ["Select Patient", "Plan Settings", "Review & Generate"] as const;

const PLAN_FEATURES = [
  { icon: <CalendarRange size={18} strokeWidth={1.5} />, label: "90-day structured programme" },
  { icon: <Apple size={18} strokeWidth={1.5} />, label: "Personalised daily diet plan" },
  { icon: <Dumbbell size={18} strokeWidth={1.5} />, label: "Progressive exercise schedule" },
  { icon: <Leaf size={18} strokeWidth={1.5} />, label: "Ayurvedic & wellness notes (if enabled)" },
];

function Stepper({ current }: { current: number }) {
  const pct = (current / (STEPS.length - 1)) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="flex justify-between" style={{ marginBottom: 12 }}>
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  background: done || active ? "var(--color-primary)" : "var(--color-primary-subtle)",
                  color: done || active ? "#fff" : "var(--color-primary)",
                }}
              >
                {done ? <Check size={14} strokeWidth={2} /> : i + 1}
              </span>
              <span
                className="text-sm"
                style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-muted)", fontWeight: active ? 600 : 500 }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 4, borderRadius: 999, background: "var(--color-primary-subtle)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-primary)", transition: "width 0.2s ease" }} />
      </div>
    </div>
  );
}

export function GeneratePlanPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const { data } = useQuery({ queryKey: ["patients"], queryFn: api.getPatients });
  const patients = (data?.patients ?? []) as Record<string, unknown>[];
  const selected = useMemo(() => patients.find((p) => String(p.id) === patientId), [patients, patientId]);

  const generate = async () => {
    setGenerating(true);
    setStatus({ text: "Generating 90-day plan… this takes about 1–2 minutes." });
    try {
      const response = await api.generatePlan(patientId);
      setStatus({ text: response.message });
      setDone(true);
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Generation failed", error: true });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Create a personalised 90-day wellness plan for a patient</p>
      </div>

      <Card style={{ maxWidth: 680, margin: "0 auto" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-success-subtle)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={28} strokeWidth={1.5} />
            </div>
            <h2>Plan generated</h2>
            <p className="text-secondary mt-2">{status?.text}</p>
            <div className="flex gap-2 justify-between mt-4" style={{ justifyContent: "center" }}>
              <Button onClick={() => navigate("/plans/view", { state: { patientId } })}>View Plan</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDone(false);
                  setStep(0);
                  setPatientId("");
                  setStatus(null);
                }}
              >
                Generate Another
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Stepper current={step} />

            {step === 0 && (
              <div>
                <h2 className="mb-3">Select a patient</h2>
                <SelectInput
                  label="Patient"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  hint={patients.length === 0 ? "No patients found — create one first." : undefined}
                >
                  <option value="">Choose a patient…</option>
                  {patients.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {String(p.firstName)} {String(p.lastName)} — {String(p.email)}
                    </option>
                  ))}
                </SelectInput>
                <div className="flex justify-between mt-4">
                  <Button variant="ghost" onClick={() => navigate("/patients")}>Cancel</Button>
                  <Button disabled={!patientId} onClick={() => setStep(1)}>
                    Continue <ArrowRight size={16} strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="mb-3">What will be generated</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {PLAN_FEATURES.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-3"
                      style={{ padding: "12px 14px", background: "var(--color-bg)", borderRadius: "var(--radius-md)" }}
                    >
                      <span style={{ color: "var(--color-primary)" }}>{f.icon}</span>
                      <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4">
                  <Button variant="secondary" leftIcon={<ArrowLeft size={16} strokeWidth={1.5} />} onClick={() => setStep(0)}>Back</Button>
                  <Button onClick={() => setStep(2)}>Continue <ArrowRight size={16} strokeWidth={1.5} /></Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="mb-3">Review &amp; generate</h2>
                {selected && (
                  <div
                    className="flex items-center gap-3 mb-4"
                    style={{ padding: 16, background: "var(--color-primary-subtle)", borderRadius: "var(--radius-md)" }}
                  >
                    <Avatar firstName={String(selected.firstName)} lastName={String(selected.lastName)} size={44} />
                    <div>
                      <div className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {String(selected.firstName)} {String(selected.lastName)}
                      </div>
                      <div className="text-sm text-secondary">{String(selected.email)}</div>
                    </div>
                  </div>
                )}
                <p className="text-sm text-secondary">
                  A 90-day diet, exercise, and wellness plan will be generated based on this patient's saved clinical
                  profile. This may take 1–2 minutes.
                </p>
                {status && <div className="mt-3"><Alert variant={status.error ? "error" : "info"}>{status.text}</Alert></div>}
                <div className="flex justify-between mt-4">
                  <Button variant="secondary" leftIcon={<ArrowLeft size={16} strokeWidth={1.5} />} disabled={generating} onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button leftIcon={<Sparkles size={16} strokeWidth={1.5} />} loading={generating} onClick={generate}>
                    Generate Plan
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
