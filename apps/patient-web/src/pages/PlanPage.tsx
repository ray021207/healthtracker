import { useEffect, useState } from "react";
import { Sunrise, Apple, Sun, Coffee, Moon, Utensils, Droplet, Lightbulb, Dumbbell, Printer, ClipboardList, Leaf, CheckCircle2 } from "lucide-react";

import { useAuth } from "../lib/auth";
import { api, type DietDay, type ExerciseDay, type AyurvedicRec } from "../lib/api";
import { Badge, Button, Card, EmptyState, Skeleton, cx } from "../components/ui";

type Tab = "diet" | "exercise" | "ayurvedic";

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Sunrise size={18} strokeWidth={1.5} />,
  morningSnack: <Apple size={18} strokeWidth={1.5} />,
  lunch: <Sun size={18} strokeWidth={1.5} />,
  afternoonSnack: <Coffee size={18} strokeWidth={1.5} />,
  dinner: <Moon size={18} strokeWidth={1.5} />,
};
const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", morningSnack: "Morning Snack", lunch: "Lunch", afternoonSnack: "Afternoon Snack", dinner: "Dinner" };
const MEAL_ORDER = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"] as const;

function orderedMealEntries<T>(meals: Record<string, T> | undefined): Array<[string, T]> {
  if (!meals) return [];
  return Object.entries(meals).sort(([a], [b]) => {
    const ai = MEAL_ORDER.indexOf(a as (typeof MEAL_ORDER)[number]);
    const bi = MEAL_ORDER.indexOf(b as (typeof MEAL_ORDER)[number]);
    return (ai === -1 ? MEAL_ORDER.length : ai) - (bi === -1 ? MEAL_ORDER.length : bi);
  });
}

function GiBadge({ gi }: { gi?: number }) {
  if (gi == null) return null;
  const variant = gi < 55 ? "success" : gi < 70 ? "warning" : "error";
  const label = gi < 55 ? "Low" : gi < 70 ? "Med" : "High";
  return <Badge variant={variant}>GI {gi} · {label}</Badge>;
}

function DayStrip({ total, current, today, onSelect }: { total: number; current: number; today: number; onSelect: (d: number) => void }) {
  const pages = Math.ceil(total / 30);
  const page = Math.floor((current - 1) / 30);
  const start = page * 30 + 1;
  const end = Math.min(start + 29, total);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i * 30 + 1)}
            style={{
              minHeight: 0,
              width: "auto",
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid",
              borderColor: page === i ? "var(--color-primary)" : "var(--color-border)",
              background: page === i ? "var(--color-primary)" : "var(--color-surface)",
              color: page === i ? "#fff" : "var(--color-text-secondary)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
            }}
          >
            Month {i + 1}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Array.from({ length: end - start + 1 }, (_, i) => {
          const d = start + i;
          const isToday = d === today;
          const isCurrent = d === current;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              style={{
                width: 38,
                height: 38,
                minHeight: 0,
                padding: 0,
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                borderColor: isCurrent ? "var(--color-primary)" : isToday ? "var(--color-primary-light)" : "var(--color-border)",
                background: isCurrent ? "var(--color-primary)" : isToday ? "var(--color-primary-subtle)" : "var(--color-surface)",
                color: isCurrent ? "#fff" : isToday ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontSize: 12,
                fontWeight: isCurrent || isToday ? 600 : 500,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DietView({ day }: { day: DietDay }) {
  const macros: [string, number | undefined, string][] = [
    ["Protein", day.totalProteinG, "var(--color-primary)"],
    ["Carbs", day.totalCarbsG, "var(--color-success)"],
    ["Fats", day.totalFatG, "var(--color-warning)"],
  ];
  return (
    <div>
      <Card className="mb-4">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) repeat(auto-fit, minmax(96px, 1fr))", gap: 12, alignItems: "start", marginBottom: 14 }}>
          <div>
            <div className="section-label">Daily Nutrition</div>
            <div style={{ fontSize: 34, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: -0.8, lineHeight: 1.1 }}>{day.totalCalories ?? "—"}</div>
            <div className="flex items-center gap-1 text-sm text-secondary mt-2">
              kcal · <Droplet size={14} strokeWidth={1.5} /> {day.hydrationLitres ?? 2.5}L
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10 }}>
            {macros.map(([l, v, c]) => (
              <div key={l} style={{ textAlign: "center", background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: "10px 8px" }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: c }}>{v ?? "—"}g</div>
                <div className="text-xs text-muted mt-2" style={{ marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {day.dailyNote && (
          <div className="flex items-start gap-2" style={{ background: "var(--color-primary-subtle)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, color: "var(--color-primary-dark)", lineHeight: 1.5 }}>
            <Lightbulb size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} /> {day.dailyNote}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {orderedMealEntries(day.meals).filter(([, m]) => m?.name).map(([key, meal]) => (
          <Card key={key}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: "var(--color-primary)" }}>{MEAL_ICONS[key] ?? <Utensils size={18} strokeWidth={1.5} />}</span>
              <span className="text-xs font-semibold text-muted flex-1" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{MEAL_LABELS[key] ?? key}</span>
              {meal?.calories != null && <span className="text-sm font-semibold" style={{ color: "var(--color-warning)" }}>{meal.calories} kcal</span>}
            </div>
            <div className="font-semibold mb-2" style={{ color: "var(--color-text-primary)", fontSize: 15 }}>{meal?.name}</div>
            {meal?.description && <div className="text-sm text-secondary mb-2" style={{ lineHeight: 1.5 }}>{meal.description}</div>}
            <GiBadge gi={meal?.giIndex} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function ExerciseView({ day }: { day: ExerciseDay }) {
  if (day.isRestDay) {
    return (
      <Card>
        <EmptyState icon={<Leaf size={26} strokeWidth={1.5} />} title="Rest Day" subtitle="Light stretching or a gentle walk — let your body recover." />
      </Card>
    );
  }
  return (
    <div>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-label">Today's Workout</div>
            <div style={{ fontSize: 30, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: -0.6, marginTop: 2 }}>{day.totalDurationMinutes ?? "—"} min</div>
            {day.totalCaloriesBurned != null && <div className="text-sm text-secondary">{day.totalCaloriesBurned} kcal burn</div>}
          </div>
          {day.phase && <Badge variant="primary">{day.phase}</Badge>}
        </div>
        {day.dayNote && (
          <div className="flex items-start gap-2 mt-3" style={{ background: "var(--color-primary-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: 13, color: "var(--color-primary-dark)" }}>
            <Dumbbell size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} /> {day.dayNote}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(day.exercises ?? []).map((ex, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{ex.name}</div>
                {ex.type && <div className="text-xs text-muted" style={{ textTransform: "capitalize", marginTop: 2 }}>{ex.type}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, color: "var(--color-primary)", fontWeight: 600 }}>
                {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ex.durationMinutes ? `${ex.durationMinutes} min` : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function printFullPlan(dietPlan: DietDay[], exercisePlan: ExerciseDay[], ayurvedicNotes: AyurvedicRec[]) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const mealOrder = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"];
  const mealLabel: Record<string, string> = { breakfast: "Breakfast", morningSnack: "Morning Snack", lunch: "Lunch", afternoonSnack: "Afternoon Snack", dinner: "Dinner" };
  const dietHTML = dietPlan.map((d) => {
    const meals = mealOrder.map((k) => {
      const m = (d.meals as Record<string, { name?: string; calories?: number; giIndex?: number; description?: string }> | undefined)?.[k];
      if (!m?.name) return "";
      return `<tr><td style="padding:4px 8px;font-size:12px;color:#6B6580">${mealLabel[k]}</td><td style="padding:4px 8px;font-size:12px;font-weight:600">${m.name}</td><td style="padding:4px 8px;font-size:12px;color:#b07d1e;text-align:right">${m.calories ?? ""}kcal</td><td style="padding:4px 8px;font-size:11px;color:#4F4A85;text-align:right">${m.giIndex != null ? `GI ${m.giIndex}` : ""}</td></tr>`;
    }).join("");
    return `<div style="page-break-inside:avoid;margin-bottom:12px;border:1px solid #E4E0EF;border-radius:8px;overflow:hidden">
      <div style="background:#E8E6F5;padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:13px;color:#37325E">Day ${d.day}</span>
        <span style="font-size:12px;color:#6B6580">${d.totalCalories ?? ""}kcal · P${d.totalProteinG ?? "—"}g C${d.totalCarbsG ?? "—"}g F${d.totalFatG ?? "—"}g · ${d.hydrationLitres ?? 2.5}L</span>
      </div>
      <table style="width:100%;border-collapse:collapse">${meals}</table>
      ${d.dailyNote ? `<div style="padding:6px 12px;font-size:11px;color:#37325E;font-style:italic;background:#F9F8FC">${d.dailyNote}</div>` : ""}
    </div>`;
  }).join("");
  const exHTML = exercisePlan.map((d) => {
    if (d.isRestDay) return `<div style="page-break-inside:avoid;margin-bottom:8px;border:1px solid #E4E0EF;border-radius:8px;padding:8px 12px;display:flex;gap:12px;align-items:center"><span style="font-weight:600;font-size:13px;color:#37325E;min-width:52px">Day ${d.day}</span><span style="font-size:12px;color:#6B6580">Rest Day</span></div>`;
    const exRows = (d.exercises ?? []).map((ex) => `<span style="display:inline-block;margin:2px 4px 2px 0;background:#E8E6F5;border-radius:5px;padding:2px 8px;font-size:11px;font-weight:500;color:#37325E">${ex.name}${ex.sets && ex.reps ? ` ${ex.sets}×${ex.reps}` : ex.durationMinutes ? ` ${ex.durationMinutes}min` : ""}</span>`).join("");
    return `<div style="page-break-inside:avoid;margin-bottom:8px;border:1px solid #E4E0EF;border-radius:8px;padding:8px 12px"><div style="display:flex;gap:12px;align-items:center;margin-bottom:6px"><span style="font-weight:600;font-size:13px;color:#37325E;min-width:52px">Day ${d.day}</span><span style="font-size:11px;background:#E8E6F5;color:#37325E;border-radius:5px;padding:2px 8px;font-weight:600;text-transform:capitalize">${d.phase ?? ""}</span><span style="font-size:12px;color:#6B6580;margin-left:auto">${d.totalDurationMinutes ?? "—"}min · ${d.totalCaloriesBurned ?? "—"}kcal</span></div><div>${exRows}</div></div>`;
  }).join("");
  const ayurHTML = ayurvedicNotes.length > 0 ? ayurvedicNotes.map((r) => `<div style="border:1px solid #E4E0EF;border-left:3px solid #4F4A85;border-radius:8px;padding:12px 16px;margin-bottom:10px"><div style="font-weight:600;color:#37325E;margin-bottom:4px">${r.name}</div>${r.suggestion ? `<div style="font-size:13px;color:#1E1A2E;margin-bottom:4px">${r.suggestion}</div>` : ""}${r.benefits ? `<div style="font-size:12px;color:#6B6580">${r.benefits}</div>` : ""}</div>`).join("") : "";

  win.document.write(`<!doctype html><html><head><title>My 90-Day Wellness Plan</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #1E1A2E; padding: 32px; background: #fff; }
  h1 { font-size: 22px; font-weight: 600; color: #37325E; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 600; color: #1E1A2E; margin: 28px 0 12px; border-bottom: 1px solid #E8E6F5; padding-bottom: 8px; }
  .meta { font-size: 13px; color: #6B6580; margin-bottom: 28px; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h1>My 90-Day Wellness Plan</h1>
<div class="meta">HECOS · Printed ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
<h2>Diet Plan (90 days)</h2>${dietHTML}
<h2>Exercise Plan (90 days)</h2>${exHTML}
${ayurvedicNotes.length > 0 ? `<h2>Ayurvedic Recommendations</h2>${ayurHTML}` : ""}
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function PlanPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>("diet");
  const [loading, setLoading] = useState(true);
  const [noPlan, setNoPlan] = useState(false);
  const [dietPlan, setDietPlan] = useState<DietDay[]>([]);
  const [exercisePlan, setExercisePlan] = useState<ExerciseDay[]>([]);
  const [ayurvedicNotes, setAyurvedicNotes] = useState<AyurvedicRec[]>([]);
  const [totalDays, setTotalDays] = useState(90);
  const [todayNumber, setTodayNumber] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setNoPlan(true);
      return;
    }
    Promise.all([api.getPlan(accessToken), api.getTodayPlan(accessToken)]).then(([planRes, todayRes]) => {
      if (!planRes) {
        setNoPlan(true);
        return;
      }
      const p = planRes.plan as Record<string, unknown>;
      setDietPlan((p.dietPlan as DietDay[]) ?? []);
      setExercisePlan((p.exercisePlan as ExerciseDay[]) ?? []);
      if (Array.isArray(p.ayurvedicNotes)) setAyurvedicNotes(p.ayurvedicNotes as AyurvedicRec[]);
      setTotalDays((p.totalDays as number) ?? 90);
      const today = todayRes?.dayNumber ?? 1;
      setTodayNumber(today);
      setSelectedDay(today);
    }).finally(() => setLoading(false));
  }, [accessToken]);

  const currentDiet = dietPlan.find((d) => d.day === selectedDay) ?? dietPlan[selectedDay - 1];
  const currentExercise = exercisePlan.find((d) => d.day === selectedDay) ?? exercisePlan[selectedDay - 1];

  if (loading)
    return (
      <div className="page-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={120} radius={16} />
        ))}
      </div>
    );

  if (noPlan)
    return (
      <div className="page-pad">
        <Card>
          <EmptyState icon={<ClipboardList size={26} strokeWidth={1.5} />} title="No plan yet" subtitle="Your practitioner will generate your personalised 90-day plan." />
        </Card>
      </div>
    );

  const tabs: { key: Tab; label: string }[] = [
    { key: "diet", label: "Diet" },
    { key: "exercise", label: "Exercise" },
    ...(ayurvedicNotes.length > 0 ? [{ key: "ayurvedic" as Tab, label: "Ayurvedic" }] : []),
  ];

  return (
    <div className="page-pad">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-sm text-secondary font-medium">Your 90-Day Journey</div>
          <h1 style={{ marginTop: 2 }}>Full Plan</h1>
          <div className="text-sm text-secondary mt-2">
            Day <strong style={{ color: "var(--color-primary)" }}>{todayNumber}</strong> of {totalDays} · tap any day to browse
          </div>
        </div>
        <Button variant="secondary" leftIcon={<Printer size={16} strokeWidth={1.5} />} onClick={() => printFullPlan(dietPlan, exercisePlan, ayurvedicNotes)} style={{ minHeight: 40, fontSize: 13 }}>
          Print
        </Button>
      </div>

      <Card className="mb-4">
        <div className="section-label">
          Viewing Day {selectedDay} {selectedDay === todayNumber ? "· Today" : ""}
        </div>
        <DayStrip total={totalDays} current={selectedDay} today={todayNumber} onSelect={setSelectedDay} />
      </Card>

      <div className="segmented mb-4">
        {tabs.map(({ key, label }) => (
          <button key={key} type="button" className={cx("seg", tab === key && "active")} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "diet" && (currentDiet ? <DietView day={currentDiet} /> : <Card><EmptyState icon={<Utensils size={24} strokeWidth={1.5} />} title={`No diet data for day ${selectedDay}`} /></Card>)}
      {tab === "exercise" && (currentExercise ? <ExerciseView day={currentExercise} /> : <Card><EmptyState icon={<Dumbbell size={24} strokeWidth={1.5} />} title={`No exercise data for day ${selectedDay}`} /></Card>)}
      {tab === "ayurvedic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ayurvedicNotes.map((rec, i) => (
            <Card key={i} style={{ borderLeft: "3px solid var(--color-primary)" }}>
              <div className="font-semibold" style={{ color: "var(--color-primary)", fontSize: 16, marginBottom: 4 }}>{rec.name}</div>
              {rec.category && <div className="text-xs font-semibold text-muted mb-2" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{rec.category}</div>}
              {rec.suggestion && <div className="text-sm mb-2" style={{ color: "var(--color-text-primary)", lineHeight: 1.6 }}>{rec.suggestion}</div>}
              {rec.benefits && (
                <div className="flex items-start gap-2 text-sm text-secondary mb-2">
                  <CheckCircle2 size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1, color: "var(--color-success)" }} /> {rec.benefits}
                </div>
              )}
              {rec.disclaimer && <div className="text-xs text-muted" style={{ fontStyle: "italic", borderTop: "1px solid var(--color-border)", paddingTop: 10, marginTop: 8 }}>{rec.disclaimer}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
