import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Sparkles, FileText, HeartPulse, Activity, FolderOpen, Pencil, ArrowRight } from "lucide-react";

import { api } from "../lib/api";
import { Alert, Avatar, Badge, Button, Card, EmptyState, Skeleton, cx } from "../components/ui";

type Tab = "overview" | "profile" | "plans" | "progress" | "documents";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "profile", label: "Health Profile" },
  { key: "plans", label: "Plans" },
  { key: "progress", label: "Progress" },
  { key: "documents", label: "Documents" },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

/* ====================================================================
   Clinical profile — values with reference ranges and Low/Normal/High status
   ==================================================================== */
type MetricStatus = { label: string; variant: "success" | "warning" | "error" } | null;

const num = (v: unknown): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function ldlStatus(v?: number): MetricStatus {
  if (v == null) return null;
  if (v < 130) return { label: "Normal", variant: "success" };
  if (v < 160) return { label: "Borderline", variant: "warning" };
  return { label: "High", variant: "error" };
}
function hdlStatus(v: number | undefined, gender: string): MetricStatus {
  if (v == null) return null;
  const low = gender.toUpperCase() === "FEMALE" ? 50 : 40;
  if (v < low) return { label: "Low", variant: "error" };
  return { label: "Normal", variant: "success" };
}
function trigStatus(v?: number): MetricStatus {
  if (v == null) return null;
  if (v < 150) return { label: "Normal", variant: "success" };
  if (v < 200) return { label: "Borderline", variant: "warning" };
  return { label: "High", variant: "error" };
}
function glucoseStatus(v?: number): MetricStatus {
  if (v == null) return null;
  if (v < 70) return { label: "Low", variant: "warning" };
  if (v < 100) return { label: "Normal", variant: "success" };
  if (v < 126) return { label: "Prediabetic", variant: "warning" };
  return { label: "High", variant: "error" };
}
function hba1cStatus(v?: number): MetricStatus {
  if (v == null) return null;
  if (v < 5.7) return { label: "Normal", variant: "success" };
  if (v < 6.5) return { label: "Prediabetic", variant: "warning" };
  return { label: "High", variant: "error" };
}
function bmiStatus(v?: number): MetricStatus {
  if (v == null) return null;
  if (v < 18.5) return { label: "Low", variant: "warning" };
  if (v < 25) return { label: "Normal", variant: "success" };
  if (v < 30) return { label: "Overweight", variant: "warning" };
  return { label: "High", variant: "error" };
}
function bpStatus(sys?: number, dia?: number): MetricStatus {
  if (sys == null || dia == null) return null;
  if (sys < 120 && dia < 80) return { label: "Normal", variant: "success" };
  if (sys < 130 && dia < 80) return { label: "Elevated", variant: "warning" };
  if (sys < 140 || dia < 90) return { label: "Stage 1", variant: "warning" };
  return { label: "High", variant: "error" };
}

function MetricRow({ label, value, unit, range, status }: { label: string; value?: number | string; unit?: string; range?: string; status?: MetricStatus }) {
  const hasValue = value != null && value !== "";
  return (
    <div className="flex items-center justify-between gap-3" style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</div>
        {range && <div className="text-xs text-muted" style={{ marginTop: 2 }}>Normal: {range}</div>}
      </div>
      <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
        <span className="text-sm font-semibold" style={{ color: hasValue ? "var(--color-text-primary)" : "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {hasValue ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
        </span>
        {status ? <Badge variant={status.variant}>{status.label}</Badge> : !hasValue ? <Badge variant="neutral">Not set</Badge> : null}
      </div>
    </div>
  );
}

function ClinicalProfileView({ profile, gender }: { profile: Record<string, unknown>; gender: string }) {
  const height = num(profile.heightCm);
  const weight = num(profile.weightKg);
  const bmi = num(profile.bmi);
  const targetWeight = num(profile.targetWeightKg);
  const ldl = num(profile.ldlMgDl);
  const hdl = num(profile.hdlMgDl);
  const trig = num(profile.triglyceridesMgDl);
  const glucose = num(profile.fastingGlucoseMgDl);
  const hba1c = num(profile.hba1cPercent);
  const sys = num(profile.systolicBp);
  const dia = num(profile.diastolicBp);
  const conditions = Array.isArray(profile.medicalConditions) ? (profile.medicalConditions as string[]) : [];
  const meds = Array.isArray(profile.medications) ? (profile.medications as string[]) : [];
  const hdlRange = gender.toUpperCase() === "FEMALE" ? "≥ 50 mg/dL" : "≥ 40 mg/dL";

  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <div className="card-header"><h2>Body Measurements</h2></div>
          <MetricRow label="Height" value={height} unit="cm" />
          <MetricRow label="Weight" value={weight} unit="lb" />
          <MetricRow label="Target Weight" value={targetWeight} unit="lb" />
          <MetricRow label="BMI" value={bmi} range="18.5–24.9" status={bmiStatus(bmi)} />
        </Card>

        <Card>
          <div className="card-header"><h2>Cholesterol Panel</h2></div>
          <MetricRow label="LDL" value={ldl} unit="mg/dL" range="< 130 mg/dL" status={ldlStatus(ldl)} />
          <MetricRow label="HDL" value={hdl} unit="mg/dL" range={hdlRange} status={hdlStatus(hdl, gender)} />
          <MetricRow label="Triglycerides" value={trig} unit="mg/dL" range="< 150 mg/dL" status={trigStatus(trig)} />
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <div className="card-header"><h2>Blood Sugar</h2></div>
          <MetricRow label="Fasting Glucose" value={glucose} unit="mg/dL" range="70–99 mg/dL" status={glucoseStatus(glucose)} />
          <MetricRow label="HbA1c" value={hba1c} unit="%" range="< 5.7%" status={hba1cStatus(hba1c)} />
        </Card>

        <Card>
          <div className="card-header"><h2>Blood Pressure</h2></div>
          <MetricRow
            label="Blood Pressure"
            value={sys != null && dia != null ? `${sys}/${dia}` : undefined}
            unit="mmHg"
            range="< 120/80 mmHg"
            status={bpStatus(sys, dia)}
          />
        </Card>

        <Card>
          <div className="card-header"><h2>Flags &amp; History</h2></div>
          <div className="flex items-center justify-between" style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Diabetic</span>
            {profile.isDiabetic ? <Badge variant="error">Yes</Badge> : <Badge variant="success">No</Badge>}
          </div>
          <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
            <div className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>Medical Conditions</div>
            {conditions.length ? (
              <div className="flex gap-2 flex-wrap">{conditions.map((c) => <Badge key={c} variant="neutral">{c}</Badge>)}</div>
            ) : (
              <span className="text-sm text-muted">None recorded</span>
            )}
          </div>
          <div style={{ padding: "12px 0" }}>
            <div className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>Medications</div>
            {meds.length ? (
              <div className="flex gap-2 flex-wrap">{meds.map((m) => <Badge key={m} variant="neutral">{m}</Badge>)}</div>
            ) : (
              <span className="text-sm text-muted">None recorded</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function PatientDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [planMsg, setPlanMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.getPatient(id),
    enabled: Boolean(id),
  });
  const { data: planData } = useQuery({
    queryKey: ["plan", id],
    queryFn: () => api.getPlan(id),
    enabled: Boolean(id),
    retry: false,
  });
  const { data: hpData } = useQuery({
    queryKey: ["health-profile", id],
    queryFn: () => api.getHealthProfile(id),
    enabled: Boolean(id),
  });

  const patient = data?.patient;
  const plan = planData?.plan;
  const profile = hpData?.healthProfile ?? null;

  const generatePlan = async () => {
    if (!profile) {
      setPlanMsg({ text: "This patient's health profile has not been entered yet, so a plan can't be generated. Add their clinical profile first.", error: true });
      return;
    }
    setGenerating(true);
    setPlanMsg({ text: "Generating 90-day plan… this takes about 1–2 minutes." });
    try {
      const res = await api.generatePlan(id);
      setPlanMsg({ text: res.message });
      void queryClient.invalidateQueries({ queryKey: ["plan", id] });
    } catch (err) {
      setPlanMsg({ text: err instanceof Error ? err.message : "Generation failed", error: true });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height={80} radius={16} />
        <Skeleton height={240} radius={16} />
      </div>
    );
  }
  if (!patient) {
    return <EmptyState icon={<FolderOpen size={26} strokeWidth={1.5} />} title="Patient not found" />;
  }

  const fullName = `${String(patient.firstName)} ${String(patient.lastName)}`;
  const active = patient.isActive !== false;

  return (
    <div className="page-enter">
      {/* Identity header */}
      <Card className="mb-4" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar firstName={String(patient.firstName)} lastName={String(patient.lastName)} size={56} />
            <div>
              <h1 style={{ fontSize: 22 }}>{fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
                {plan ? <Badge variant="primary">Plan generated</Badge> : <Badge variant="warning">No plan</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Pencil size={16} strokeWidth={1.5} />} onClick={() => navigate(`/patients/${id}/health-profile`)}>
              Edit Profile
            </Button>
            <Button
              leftIcon={<Sparkles size={16} strokeWidth={1.5} />}
              loading={generating}
              disabled={!profile}
              title={!profile ? "Add this patient's health profile before generating a plan" : undefined}
              onClick={generatePlan}
            >
              {plan ? "Regenerate Plan" : "Generate Plan"}
            </Button>
          </div>
        </div>
        {!profile && (
          <div className="mt-3">
            <Alert variant="warning">Health profile not entered yet — a plan can't be generated until it is.</Alert>
          </div>
        )}
        {planMsg && (
          <div className="mt-3">
            <Alert variant={planMsg.error ? "error" : "info"}>{planMsg.text}</Alert>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={cx("tab", tab === t.key && "active")} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "60fr 40fr", gap: 20, alignItems: "start" }}>
          <Card>
            <div className="card-header"><h2>Patient Information</h2></div>
            <InfoRow label="Email" value={String(patient.email)} />
            <InfoRow label="Date of Birth" value={new Date(String(patient.dateOfBirth)).toLocaleDateString()} />
            <InfoRow label="Gender" value={String(patient.gender)} />
            <InfoRow label="Status" value={active ? "Active" : "Inactive"} />
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <div className="card-header"><h2>Active Plan</h2></div>
              {plan ? (
                <>
                  <InfoRow label="Status" value={String(plan.status)} />
                  <InfoRow label="Generated" value={new Date(String(plan.generatedAt)).toLocaleDateString()} />
                  <Button variant="secondary" className="w-full mt-3" onClick={() => navigate("/plans/view", { state: { patientId: id } })}>
                    <FileText size={16} strokeWidth={1.5} /> View Full Plan
                  </Button>
                </>
              ) : (
                <p className="text-sm text-secondary">No plan yet. Save a health profile, then generate a plan.</p>
              )}
              {planMsg && <div className="mt-3"><Alert variant={planMsg.error ? "error" : "info"}>{planMsg.text}</Alert></div>}
            </Card>

            <Card>
              <div className="card-header"><h2>Quick Actions</h2></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to={`/patients/${id}/health-profile`} className="btn btn-secondary w-full" style={{ justifyContent: "flex-start" }}>
                  <HeartPulse size={18} strokeWidth={1.5} /> Edit Clinical Profile
                </Link>
                <Link to={`/patients/${id}/progress`} className="btn btn-secondary w-full" style={{ justifyContent: "flex-start" }}>
                  <Activity size={18} strokeWidth={1.5} /> View Progress
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "profile" && (
        profile ? (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted">Status key:</span>
                <Badge variant="success">Normal</Badge>
                <Badge variant="warning">Borderline / Low</Badge>
                <Badge variant="error">High</Badge>
              </div>
              <Button variant="secondary" leftIcon={<Pencil size={16} strokeWidth={1.5} />} onClick={() => navigate(`/patients/${id}/health-profile`)}>
                Edit Clinical Profile
              </Button>
            </div>
            <ClinicalProfileView profile={profile} gender={String(patient.gender ?? "")} />
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<HeartPulse size={26} strokeWidth={1.5} />}
              title="No clinical profile yet"
              subtitle="Add vitals and lab values used to generate the wellness plan."
              action={<Button onClick={() => navigate(`/patients/${id}/health-profile`)}>Add Clinical Profile <ArrowRight size={16} strokeWidth={1.5} /></Button>}
            />
          </Card>
        )
      )}

      {tab === "plans" && (
        <Card>
          {plan ? (
            <>
              <div className="card-header"><h2>Wellness Plan</h2></div>
              <InfoRow label="Status" value={String(plan.status)} />
              <InfoRow label="Generated" value={new Date(String(plan.generatedAt)).toLocaleString()} />
              {plan.regeneratedAt ? <InfoRow label="Last regenerated" value={new Date(String(plan.regeneratedAt)).toLocaleString()} /> : null}
              <InfoRow label="AI model" value={String(plan.aiModel)} />
              <div className="flex gap-2 mt-3">
                <Button onClick={() => navigate("/plans/view", { state: { patientId: id } })}>
                  <FileText size={16} strokeWidth={1.5} /> View Full Plan
                </Button>
                <Button variant="secondary" loading={generating} disabled={!profile} onClick={generatePlan}>Regenerate</Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Sparkles size={26} strokeWidth={1.5} />}
              title="No plan generated yet"
              subtitle={profile ? "Ready to generate a 90-day plan for this patient." : "Add this patient's health profile first, then you can generate a 90-day plan."}
              action={
                profile ? (
                  <Button leftIcon={<Sparkles size={16} strokeWidth={1.5} />} loading={generating} onClick={generatePlan}>Generate 90-Day Plan</Button>
                ) : (
                  <Button leftIcon={<ArrowRight size={16} strokeWidth={1.5} />} onClick={() => navigate(`/patients/${id}/health-profile`)}>Add Clinical Profile</Button>
                )
              }
            />
          )}
        </Card>
      )}

      {tab === "progress" && (
        <Card>
          <EmptyState
            icon={<Activity size={26} strokeWidth={1.5} />}
            title="Patient progress"
            subtitle="Logged metrics and adherence over time."
            action={<Button onClick={() => navigate(`/patients/${id}/progress`)}>Open Progress <ArrowRight size={16} strokeWidth={1.5} /></Button>}
          />
        </Card>
      )}

      {tab === "documents" && (
        <Card>
          <EmptyState icon={<FolderOpen size={26} strokeWidth={1.5} />} title="No documents" subtitle="Uploaded files and reports will appear here." />
        </Card>
      )}
    </div>
  );
}
