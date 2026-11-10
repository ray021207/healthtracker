import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Leaf } from "lucide-react";

import { api } from "../lib/api";
import { Alert, Button, Card, TextInput } from "../components/ui";

// Lifestyle defaults are preserved from existing profile; admin only edits clinical data
const clinicalDefaults = {
  heightCm: 170,
  weightKg: 165,
  targetWeightKg: undefined as number | undefined,
  abdomenIn: undefined as number | undefined,
  clinicianNotes: "",
  ldlMgDl: undefined as number | undefined,
  hdlMgDl: undefined as number | undefined,
  triglyceridesMgDl: undefined as number | undefined,
  fastingGlucoseMgDl: undefined as number | undefined,
  hba1cPercent: undefined as number | undefined,
  systolicBp: undefined as number | undefined,
  diastolicBp: undefined as number | undefined,
  isDiabetic: false,
  medicalConditions: [] as string[],
  medications: [] as string[],
};

// Lifestyle fields — set by patient, preserved by admin on save
const lifestyleDefaults = {
  activityLevel: "MODERATELY_ACTIVE",
  dietStyle: "BALANCED",
  dietaryRestrictions: [] as string[],
  allergies: [] as string[],
  includeAyurvedic: false,
  includeAntiInflammatory: false,
};

type Payload = typeof clinicalDefaults & typeof lifestyleDefaults;

const numOrUndefined = (v: string) => (v === "" ? undefined : Number(v));
const tagsToString = (arr: string[]) => arr.join(", ");
const stringToTags = (s: string): string[] => s.split(",").map((t) => t.trim()).filter(Boolean);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.05em",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 mt-2"
      style={{ padding: "8px 12px", background: "var(--color-bg)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--color-text-secondary)" }}
    >
      <Info size={14} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}

export function EditHealthProfilePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ text: string; variant: "success" | "error" | "info" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<Payload>({ ...clinicalDefaults, ...lifestyleDefaults });
  // Calorie / macro targets: automatic unless the clinician switches on manual entry.
  const [manualTargets, setManualTargets] = useState(false);
  const [targets, setTargets] = useState({ calories: "", protein: "", carbs: "", fat: "" });

  const { data } = useQuery({
    queryKey: ["health-profile", id],
    queryFn: () => api.getHealthProfile(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const hp = data?.healthProfile;
    if (!hp) return;
    setPayload({
      heightCm: Number(hp.heightCm) || clinicalDefaults.heightCm,
      weightKg: Number(hp.weightKg) || clinicalDefaults.weightKg,
      targetWeightKg: hp.targetWeightKg ? Math.round(Number(hp.targetWeightKg) * 10) / 10 : undefined,
      abdomenIn: hp.abdomenIn ? Number(hp.abdomenIn) : undefined,
      clinicianNotes: typeof hp.clinicianNotes === "string" ? hp.clinicianNotes : "",
      ldlMgDl: hp.ldlMgDl ? Number(hp.ldlMgDl) : undefined,
      hdlMgDl: hp.hdlMgDl ? Number(hp.hdlMgDl) : undefined,
      triglyceridesMgDl: hp.triglyceridesMgDl ? Number(hp.triglyceridesMgDl) : undefined,
      fastingGlucoseMgDl: hp.fastingGlucoseMgDl ? Number(hp.fastingGlucoseMgDl) : undefined,
      hba1cPercent: hp.hba1cPercent ? Number(hp.hba1cPercent) : undefined,
      systolicBp: hp.systolicBp ? Number(hp.systolicBp) : undefined,
      diastolicBp: hp.diastolicBp ? Number(hp.diastolicBp) : undefined,
      isDiabetic: Boolean(hp.isDiabetic),
      medicalConditions: Array.isArray(hp.medicalConditions) ? (hp.medicalConditions as string[]) : [],
      medications: Array.isArray(hp.medications) ? (hp.medications as string[]) : [],
      activityLevel: String(hp.activityLevel || lifestyleDefaults.activityLevel),
      dietStyle: String(hp.dietStyle || lifestyleDefaults.dietStyle),
      dietaryRestrictions: Array.isArray(hp.dietaryRestrictions) ? (hp.dietaryRestrictions as string[]) : [],
      allergies: Array.isArray(hp.allergies) ? (hp.allergies as string[]) : [],
      includeAyurvedic: Boolean(hp.includeAyurvedic),
      includeAntiInflammatory: Boolean(hp.includeAntiInflammatory),
    });
    setManualTargets(Boolean(hp.targetsOverridden));
    setTargets({
      calories: String(Math.round(Number(hp.dailyCalorieTarget) || 0) || ""),
      protein: String(Math.round(Number(hp.dailyProteinG) || 0) || ""),
      carbs: String(Math.round(Number(hp.dailyCarbsG) || 0) || ""),
      fat: String(Math.round(Number(hp.dailyFatG) || 0) || ""),
    });
  }, [data]);

  const suggested = data?.suggestedTargets ?? null;
  const macroKcal = 4 * (Number(targets.protein) + Number(targets.carbs)) + 9 * Number(targets.fat);

  const resetToSuggested = () => {
    if (!suggested) return;
    setTargets({
      calories: String(suggested.dailyCalorieTarget),
      protein: String(suggested.dailyProteinG),
      carbs: String(suggested.dailyCarbsG),
      fat: String(suggested.dailyFatG),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let nutritionTargets: Record<string, number> | null = null;
    if (manualTargets) {
      const values = {
        dailyCalorieTarget: Number(targets.calories),
        dailyProteinG: Number(targets.protein),
        dailyCarbsG: Number(targets.carbs),
        dailyFatG: Number(targets.fat),
      };
      if (!(values.dailyCalorieTarget >= 800) || Object.values(values).some((v) => !Number.isFinite(v) || v < 0)) {
        setStatus({ text: "Enter calories (800 or more) and grams of protein, carbs and fat.", variant: "error" });
        return;
      }
      nutritionTargets = values;
    }

    setSaving(true);
    setStatus({ text: "Saving…", variant: "info" });
    try {
      await api.upsertHealthProfile(id, {
        ...payload,
        abdomenIn: payload.abdomenIn ?? null,
        clinicianNotes: payload.clinicianNotes.trim() === "" ? null : payload.clinicianNotes.trim(),
        nutritionTargets,
      });
      setStatus({ text: "Health profile saved", variant: "success" });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Failed to save", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof Payload, value: unknown) => setPayload((p) => ({ ...p, [key]: value }));

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle" style={{ maxWidth: 640 }}>
          Vitals and lab values used to generate the personalised 90-day wellness plan. Activity &amp; diet preferences
          are set by the patient.
        </p>
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} strokeWidth={1.5} />} onClick={() => navigate(`/patients/${id}`)}>
          Back
        </Button>
      </div>

      <form onSubmit={submit}>
        <div className="grid-2" style={{ alignItems: "start" }}>
          {/* Left column */}
          <Card>
            <Section title="Body Measurements">
              <div className="grid-2">
                <TextInput
                  label="Height (cm)"
                  type="number"
                  value={payload.heightCm}
                  min={100}
                  max={250}
                  onChange={(e) => set("heightCm", Number(e.target.value))}
                />
                <TextInput
                  label="Current Weight (lb)"
                  type="number"
                  value={payload.weightKg}
                  min={70}
                  max={500}
                  step="0.1"
                  onChange={(e) => set("weightKg", Number(e.target.value))}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <TextInput
                  label="Target Weight (lb) — optional"
                  type="number"
                  value={payload.targetWeightKg ?? ""}
                  min={70}
                  max={500}
                  step="0.1"
                  placeholder="e.g. 150"
                  onChange={(e) => set("targetWeightKg", numOrUndefined(e.target.value))}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <TextInput
                  label="Abdomen width (in) — optional"
                  type="number"
                  value={payload.abdomenIn ?? ""}
                  min={15}
                  max={80}
                  step="0.1"
                  placeholder="e.g. 36"
                  onChange={(e) => set("abdomenIn", numOrUndefined(e.target.value))}
                />
              </div>
              <Hint>Measured around the abdomen at the navel. Fat is stored there more, so it is shared with plan generation.</Hint>
            </Section>

            <Section title="Cholesterol Panel">
              <div className="grid-2">
                <TextInput label="LDL (mg/dL)" type="number" value={payload.ldlMgDl ?? ""} placeholder="e.g. 130" onChange={(e) => set("ldlMgDl", numOrUndefined(e.target.value))} />
                <TextInput label="HDL (mg/dL)" type="number" value={payload.hdlMgDl ?? ""} placeholder="e.g. 55" onChange={(e) => set("hdlMgDl", numOrUndefined(e.target.value))} />
              </div>
              <div style={{ marginTop: 16 }}>
                <TextInput label="Triglycerides (mg/dL)" type="number" value={payload.triglyceridesMgDl ?? ""} placeholder="e.g. 150" onChange={(e) => set("triglyceridesMgDl", numOrUndefined(e.target.value))} />
              </div>
              <Hint>LDL &gt;130 triggers low-cholesterol meal planning. HDL &lt;40 (M) / &lt;50 (F) increases heart risk flags.</Hint>
            </Section>

            <Section title="Blood Sugar">
              <div className="grid-2">
                <TextInput label="Fasting Glucose (mg/dL)" type="number" value={payload.fastingGlucoseMgDl ?? ""} placeholder="e.g. 95" onChange={(e) => set("fastingGlucoseMgDl", numOrUndefined(e.target.value))} />
                <TextInput label="HbA1c (%)" type="number" value={payload.hba1cPercent ?? ""} placeholder="e.g. 5.7" step="0.1" onChange={(e) => set("hba1cPercent", numOrUndefined(e.target.value))} />
              </div>
              <Hint>Fasting glucose ≥126 or HbA1c ≥6.5% = diabetic range.</Hint>
            </Section>

            <Section title="Blood Pressure">
              <div className="grid-2">
                <TextInput label="Systolic (mmHg)" type="number" value={payload.systolicBp ?? ""} placeholder="e.g. 120" onChange={(e) => set("systolicBp", numOrUndefined(e.target.value))} />
                <TextInput label="Diastolic (mmHg)" type="number" value={payload.diastolicBp ?? ""} placeholder="e.g. 80" onChange={(e) => set("diastolicBp", numOrUndefined(e.target.value))} />
              </div>
            </Section>
          </Card>

          {/* Right column */}
          <Card>
            <Section title="Daily Nutrition Targets">
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, textTransform: "none", letterSpacing: 0, marginBottom: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={manualTargets} onChange={(e) => setManualTargets(e.target.checked)} style={{ width: "auto", marginTop: 2, flexShrink: 0 }} />
                <span>
                  <span className="font-semibold" style={{ display: "block", color: "var(--color-text-primary)" }}>Set targets manually</span>
                  <span className="text-xs text-muted">Otherwise they are calculated from weight, activity and diet style</span>
                </span>
              </label>
              <div className="grid-2">
                <TextInput label="Calories (kcal)" type="number" value={targets.calories} disabled={!manualTargets} onChange={(e) => setTargets((t) => ({ ...t, calories: e.target.value }))} />
                <TextInput label="Protein (g)" type="number" value={targets.protein} disabled={!manualTargets} onChange={(e) => setTargets((t) => ({ ...t, protein: e.target.value }))} />
                <TextInput label="Carbs (g)" type="number" value={targets.carbs} disabled={!manualTargets} onChange={(e) => setTargets((t) => ({ ...t, carbs: e.target.value }))} />
                <TextInput label="Fat (g)" type="number" value={targets.fat} disabled={!manualTargets} onChange={(e) => setTargets((t) => ({ ...t, fat: e.target.value }))} />
              </div>
              {manualTargets && Number(targets.calories) > 0 && (
                <Hint>
                  Macros add up to about {Math.round(macroKcal)} kcal ({Math.round((macroKcal / Number(targets.calories)) * 100)}% of the calorie target).
                </Hint>
              )}
              {suggested && (
                <div className="flex items-center gap-3 mt-2" style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  <span>
                    Calculated today: {suggested.dailyCalorieTarget} kcal · P {suggested.dailyProteinG} · C {suggested.dailyCarbsG} · F {suggested.dailyFatG} g
                  </span>
                  {manualTargets && (
                    <Button type="button" variant="secondary" onClick={resetToSuggested}>Use these</Button>
                  )}
                </div>
              )}
              <Hint>The 90-day meal plan and the patient's daily calorie ring use these numbers. Regenerate the plan after changing them.</Hint>
            </Section>

            <Section title="Clinician Recommendations">
              <label htmlFor="clinicianNotes">Recommendations for this patient</label>
              <textarea
                id="clinicianNotes"
                rows={4}
                maxLength={2000}
                value={payload.clinicianNotes}
                placeholder="e.g. Prefer high-fibre breakfasts, limit fruit juice, walk 20 minutes after dinner"
                onChange={(e) => set("clinicianNotes", e.target.value)}
              />
              <Hint>Shown to the patient and followed when the meal plan is generated.</Hint>
            </Section>

            <Section title="Clinical Flags">
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, textTransform: "none", letterSpacing: 0, marginBottom: 0, cursor: "pointer" }}>
                <input type="checkbox" checked={payload.isDiabetic} onChange={(e) => set("isDiabetic", e.target.checked)} style={{ width: "auto", marginTop: 2, flexShrink: 0 }} />
                <span>
                  <span className="font-semibold" style={{ display: "block", color: "var(--color-text-primary)" }}>Diabetic</span>
                  <span className="text-xs text-muted">Applies strict GI index to all meals</span>
                </span>
              </label>
            </Section>

            <Section title="Medical Conditions">
              <TextInput label="Conditions (comma-separated)" value={tagsToString(payload.medicalConditions)} placeholder="e.g. hypertension, PCOS" onChange={(e) => set("medicalConditions", stringToTags(e.target.value))} />
            </Section>

            <Section title="Current Medications">
              <TextInput label="Medications (comma-separated)" value={tagsToString(payload.medications)} placeholder="e.g. metformin 500mg" onChange={(e) => set("medications", stringToTags(e.target.value))} />
            </Section>

            <div
              className="flex items-start gap-3"
              style={{ padding: 16, background: "var(--color-primary-subtle)", borderRadius: "var(--radius-md)" }}
            >
              <Leaf size={18} strokeWidth={1.5} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="font-semibold" style={{ color: "var(--color-primary-dark)" }}>Patient-managed preferences</div>
                <div className="text-xs text-secondary mt-1" style={{ lineHeight: 1.6 }}>
                  Activity level, diet style, dietary restrictions, allergies, and wellness flags are entered by the
                  patient directly on their portal.
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button type="submit" loading={saving}>Save Clinical Profile</Button>
          {status && <Alert variant={status.variant}>{status.text}</Alert>}
        </div>
      </form>
    </div>
  );
}
