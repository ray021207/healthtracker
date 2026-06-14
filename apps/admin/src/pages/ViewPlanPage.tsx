import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronDown,
  Droplet,
  Sunrise,
  Apple,
  Sun,
  Coffee,
  Moon,
  Utensils,
  Printer,
  Lightbulb,
  Dumbbell,
  CheckCircle2,
  FileText,
} from "lucide-react";

import { api } from "../lib/api";
import { Badge, Button, Card, EmptyState, TextInput, cx } from "../components/ui";

type Tab = "diet" | "exercise" | "ayurvedic";

interface Meal { name?: string; description?: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number; giIndex?: number }
interface DietDay { day: number; totalCalories?: number; totalProteinG?: number; totalCarbsG?: number; totalFatG?: number; hydrationLitres?: number; dailyNote?: string; meals?: Record<string, Meal> }
interface Exercise { name?: string; sets?: number; reps?: number; durationMinutes?: number; type?: string }
interface ExerciseDay { day: number; phase?: string; isRestDay?: boolean; totalDurationMinutes?: number; totalCaloriesBurned?: number; dayNote?: string; exercises?: Exercise[] }
interface AyurvedicRec { name?: string; category?: string; suggestion?: string; benefits?: string; disclaimer?: string }

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  morningSnack: "Morning Snack",
  lunch: "Lunch",
  afternoonSnack: "Afternoon Snack",
  dinner: "Dinner",
};
const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Sunrise size={16} strokeWidth={1.5} />,
  morningSnack: <Apple size={16} strokeWidth={1.5} />,
  lunch: <Sun size={16} strokeWidth={1.5} />,
  afternoonSnack: <Coffee size={16} strokeWidth={1.5} />,
  dinner: <Moon size={16} strokeWidth={1.5} />,
};

function GiBadge({ gi }: { gi?: number }) {
  if (gi == null) return null;
  const variant = gi < 55 ? "success" : gi < 70 ? "warning" : "error";
  const label = gi < 55 ? "Low GI" : gi < 70 ? "Med GI" : "High GI";
  return <Badge variant={variant}>GI {gi} · {label}</Badge>;
}

function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null;
  const variant: "info" | "warning" | "primary" =
    phase.toLowerCase() === "foundation" ? "info" : phase.toLowerCase() === "build" ? "warning" : "primary";
  return <Badge variant={variant}>{phase}</Badge>;
}

function AccordionRow({
  open,
  onToggle,
  accent,
  left,
  summary,
  trailing,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  accent: string;
  left: React.ReactNode;
  summary: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          height: "auto",
          background: open ? "var(--color-primary-subtle)" : "var(--color-bg)",
          border: "none",
          cursor: "pointer",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: accent, minWidth: 52 }}>{left}</span>
        <span className="flex-1 text-sm text-secondary">{summary}</span>
        {trailing}
        <ChevronDown size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)", transition: "transform 0.18s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && <div style={{ padding: "0 18px 16px", background: "var(--color-surface)" }}>{children}</div>}
    </div>
  );
}

function DietTab({ days }: { days: DietDay[] }) {
  const [expanded, setExpanded] = useState<number | null>(1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {days.map((d) => (
        <AccordionRow
          key={d.day}
          open={expanded === d.day}
          onToggle={() => setExpanded(expanded === d.day ? null : d.day)}
          accent="var(--color-primary)"
          left={`Day ${d.day}`}
          summary={
            <>
              {d.totalCalories ? `${d.totalCalories} kcal` : "—"}
              {d.totalProteinG ? ` · P ${d.totalProteinG}g` : ""}
              {d.totalCarbsG ? ` · C ${d.totalCarbsG}g` : ""}
              {d.totalFatG ? ` · F ${d.totalFatG}g` : ""}
            </>
          }
          trailing={
            d.hydrationLitres ? (
              <span className="flex items-center gap-1 text-sm text-secondary">
                <Droplet size={14} strokeWidth={1.5} /> {d.hydrationLitres}L
              </span>
            ) : undefined
          }
        >
          {d.dailyNote && (
            <div className="flex items-start gap-2" style={{ fontSize: 12, color: "var(--color-primary-dark)", background: "var(--color-primary-subtle)", borderRadius: "var(--radius-sm)", padding: "8px 12px", margin: "12px 0 14px" }}>
              <Lightbulb size={14} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} /> {d.dailyNote}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {Object.entries(d.meals ?? {}).map(([key, meal]) => (
              <div key={key} style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--color-primary)" }}>
                  {MEAL_ICONS[key] ?? <Utensils size={16} strokeWidth={1.5} />}
                  <span className="text-xs font-medium text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {MEAL_LABELS[key] ?? key}
                  </span>
                </div>
                <div className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>{meal.name ?? "—"}</div>
                {meal.description && <div className="text-xs text-secondary mb-2" style={{ lineHeight: 1.4 }}>{meal.description}</div>}
                <div className="flex items-center justify-between flex-wrap gap-1">
                  {meal.calories != null && <span className="text-xs font-medium" style={{ color: "var(--color-warning)" }}>{meal.calories} kcal</span>}
                  <GiBadge gi={meal.giIndex} />
                </div>
              </div>
            ))}
          </div>
        </AccordionRow>
      ))}
    </div>
  );
}

function ExerciseTab({ days }: { days: ExerciseDay[] }) {
  const [expanded, setExpanded] = useState<number | null>(1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {days.map((d) => (
        <AccordionRow
          key={d.day}
          open={expanded === d.day}
          onToggle={() => setExpanded(expanded === d.day ? null : d.day)}
          accent="var(--color-primary)"
          left={`Day ${d.day}`}
          summary={
            <span className="flex items-center gap-2">
              <PhaseBadge phase={d.phase} />
              {d.isRestDay
                ? "Rest Day"
                : `${d.totalDurationMinutes ? `${d.totalDurationMinutes} min` : "—"}${d.totalCaloriesBurned ? ` · ${d.totalCaloriesBurned} kcal` : ""}${d.exercises?.length ? ` · ${d.exercises.length} exercises` : ""}`}
            </span>
          }
        >
          {d.dayNote && (
            <div className="flex items-start gap-2" style={{ fontSize: 12, color: "var(--color-primary-dark)", background: "var(--color-primary-subtle)", borderRadius: "var(--radius-sm)", padding: "8px 12px", margin: "12px 0 14px" }}>
              <Dumbbell size={14} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} /> {d.dayNote}
            </div>
          )}
          {d.isRestDay ? (
            <p className="text-sm text-secondary mt-3">Recovery day — light stretching or walking only.</p>
          ) : (
            <table style={{ marginTop: 4 }}>
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th style={{ textAlign: "center" }}>Sets</th>
                  <th style={{ textAlign: "center" }}>Reps</th>
                  <th style={{ textAlign: "center" }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {(d.exercises ?? []).map((ex, i) => (
                  <tr key={i}>
                    <td className="font-medium" style={{ color: "var(--color-text-primary)" }}>{ex.name ?? "—"}</td>
                    <td className="text-secondary" style={{ textAlign: "center" }}>{ex.sets ?? "—"}</td>
                    <td className="text-secondary" style={{ textAlign: "center" }}>{ex.reps ?? "—"}</td>
                    <td className="text-secondary" style={{ textAlign: "center" }}>{ex.durationMinutes ? `${ex.durationMinutes} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AccordionRow>
      ))}
    </div>
  );
}

function AyurvedicTab({ notes }: { notes: AyurvedicRec[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {notes.map((rec, i) => (
        <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: "3px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <div className="font-semibold" style={{ color: "var(--color-primary)", marginBottom: 4 }}>{rec.name}</div>
          {rec.category && <div className="text-xs font-medium text-muted mb-3" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{rec.category}</div>}
          {rec.suggestion && <div className="text-sm mb-2" style={{ color: "var(--color-text-primary)", lineHeight: 1.6 }}>{rec.suggestion}</div>}
          {rec.benefits && (
            <div className="flex items-start gap-2 text-xs text-secondary mb-2">
              <CheckCircle2 size={14} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1, color: "var(--color-success)" }} /> {rec.benefits}
            </div>
          )}
          {rec.disclaimer && <div className="text-xs text-muted" style={{ fontStyle: "italic", borderTop: "1px solid var(--color-border)", paddingTop: 8, marginTop: 8 }}>{rec.disclaimer}</div>}
        </div>
      ))}
    </div>
  );
}

export function ViewPlanPage() {
  const location = useLocation();
  const statePatientId = (location.state as { patientId?: string } | null)?.patientId ?? "";

  const [patientId, setPatientId] = useState(statePatientId);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("diet");

  const load = async () => {
    setLoading(true);
    try {
      setError("");
      const data = await api.getPlan(patientId);
      if (!data.plan) {
        setError("No plan found for this patient.");
        setPlan(null);
        return;
      }
      setPlan(data.plan);
      setTab("diet");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plan");
    } finally {
      setLoading(false);
    }
  };

  const dietDays = (plan?.dietPlan as DietDay[] | undefined) ?? [];
  const exerciseDays = (plan?.exercisePlan as ExerciseDay[] | undefined) ?? [];
  const ayurvedicNotes = (plan?.ayurvedicNotes as AyurvedicRec[] | undefined) ?? [];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "diet", label: "Diet Plan", count: dietDays.length },
    { key: "exercise", label: "Exercise Plan", count: exerciseDays.length },
    ...(ayurvedicNotes.length > 0 ? [{ key: "ayurvedic" as Tab, label: "Ayurvedic Notes", count: ayurvedicNotes.length }] : []),
  ];

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Review the generated 90-day diet and exercise programme</p>
      </div>

      <Card className="mb-4" style={{ marginBottom: 20 }}>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <TextInput
              label="Patient ID"
              placeholder="Paste patient UUID or open from a patient page"
              value={patientId}
              error={error || undefined}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>
          <div style={{ paddingTop: 26 }}>
            <Button loading={loading} disabled={!patientId} onClick={load}>
              {loading ? "Loading…" : "Load Plan"}
            </Button>
          </div>
        </div>
      </Card>

      {plan && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-secondary">
                <strong style={{ color: "var(--color-text-primary)" }}>Status:</strong> {String(plan.status)}
              </span>
              <span className="text-sm text-secondary">
                <strong style={{ color: "var(--color-text-primary)" }}>Generated:</strong> {new Date(String(plan.generatedAt)).toLocaleString()}
              </span>
              {plan.aiModel != null && <Badge variant="primary">{String(plan.aiModel)}</Badge>}
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Printer size={16} strokeWidth={1.5} />} onClick={() => window.print()}>
              Print
            </Button>
          </div>

          <div className="tabs">
            {tabs.map(({ key, label, count }) => (
              <button key={key} type="button" className={cx("tab", tab === key && "active")} onClick={() => setTab(key)}>
                {label}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    background: tab === key ? "var(--color-primary-subtle)" : "var(--color-bg)",
                    color: tab === key ? "var(--color-primary)" : "var(--color-text-muted)",
                    borderRadius: 999,
                    padding: "1px 7px",
                  }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {tab === "diet" && <DietTab days={dietDays} />}
          {tab === "exercise" && <ExerciseTab days={exerciseDays} />}
          {tab === "ayurvedic" && <AyurvedicTab notes={ayurvedicNotes} />}
        </div>
      )}

      {!plan && !loading && (
        <Card>
          <EmptyState icon={<FileText size={26} strokeWidth={1.5} />} title="No plan loaded" subtitle="Enter a patient ID above and load their wellness plan." />
        </Card>
      )}
    </div>
  );
}
