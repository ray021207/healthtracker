import { useEffect, useState } from "react";
import { Check, Sunrise, Apple, Sun, Coffee, Moon, Utensils, Dumbbell, Droplet } from "lucide-react";

import { useAuth } from "../lib/auth";
import { api, type DietDay, type ExerciseDay } from "../lib/api";
import { Alert, Button } from "../components/ui";

const MEAL_KEYS = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"] as const;
const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Sunrise size={16} strokeWidth={1.5} />,
  morningSnack: <Apple size={16} strokeWidth={1.5} />,
  lunch: <Sun size={16} strokeWidth={1.5} />,
  afternoonSnack: <Coffee size={16} strokeWidth={1.5} />,
  dinner: <Moon size={16} strokeWidth={1.5} />,
};
const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", morningSnack: "Morning Snack", lunch: "Lunch", afternoonSnack: "Afternoon Snack", dinner: "Dinner" };
type MealKey = (typeof MEAL_KEYS)[number];
const OZ_PER_LITRE = 33.814;

function toStoredWaterOz(value: number): number {
  // Backward compatibility for older logs that stored litres.
  if (value <= 10) return value * OZ_PER_LITRE;
  return value;
}

function CheckItem({ icon, label, sub, checked, onToggle }: { icon: React.ReactNode; label: string; sub?: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 16px",
        width: "100%",
        minHeight: 52,
        background: checked ? "var(--color-primary-subtle)" : "transparent",
        border: "none",
        borderBottom: "1px solid var(--color-border)",
        cursor: "pointer",
        transition: "var(--transition)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "var(--radius-sm)",
          flexShrink: 0,
          marginRight: 14,
          border: `2px solid ${checked ? "var(--color-primary)" : "var(--color-border)"}`,
          background: checked ? "var(--color-primary)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition)",
        }}
      >
        {checked && <Check size={15} strokeWidth={2.5} color="#fff" />}
      </div>
      <div style={{ flex: 1 }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-primary)" }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: checked ? "var(--color-text-primary)" : "var(--color-text-secondary)", textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{label}</span>
        </div>
        {sub && <div className="text-xs text-muted" style={{ marginTop: 2, paddingLeft: 24 }}>{sub}</div>}
      </div>
      {checked && <span className="text-xs font-semibold" style={{ color: "var(--color-primary)", marginLeft: 8 }}>Done</span>}
    </button>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
      <div className="section-label" style={{ marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              width: 40,
              height: 40,
              minHeight: 0,
              padding: 0,
              borderRadius: "var(--radius-md)",
              border: "1px solid",
              borderColor: v <= value ? "var(--color-primary)" : "var(--color-border)",
              background: v <= value ? "var(--color-primary)" : "var(--color-surface)",
              color: v <= value ? "#fff" : "var(--color-text-muted)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "var(--transition)",
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TrackPage() {
  const { accessToken } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const [dietDay, setDietDay] = useState<DietDay | null>(null);
  const [exerciseDay, setExerciseDay] = useState<ExerciseDay | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [meals, setMeals] = useState<Record<MealKey, boolean>>({ breakfast: false, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false });
  const [exerciseDone, setExerciseDone] = useState(false);
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [water, setWater] = useState("84");
  const [weightKg, setWeightKg] = useState("");
  const [energyLevel, setEnergyLevel] = useState(0);
  const [mood, setMood] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    Promise.all([api.getTodayPlan(accessToken), api.getDailyLog(today, accessToken)]).then(([todayPlan, logRes]) => {
      if (todayPlan) {
        setDietDay(todayPlan.dietDay);
        setExerciseDay(todayPlan.exerciseDay);
        setDayNumber(todayPlan.dayNumber);
      }
      const log = logRes?.log as Record<string, unknown> | null;
      if (log) {
        setMeals({ breakfast: !!log.breakfastDone, morningSnack: !!log.snack1Done, lunch: !!log.lunchDone, afternoonSnack: !!log.snack2Done, dinner: !!log.dinnerDone });
        setExerciseDone(!!log.exerciseDone);
        if (log.exerciseDuration) setExerciseDuration(String(log.exerciseDuration));
        if (log.waterLitres) setWater(String(Math.round(toStoredWaterOz(Number(log.waterLitres)))));
        if (log.weightKg) setWeightKg(String(log.weightKg));
        if (log.energyLevel) setEnergyLevel(log.energyLevel as number);
        if (log.mood) setMood(log.mood as number);
        if (log.mealNotes) setNotes(log.mealNotes as string);
      }
    }).finally(() => setLoading(false));
  }, [accessToken]);

  const mealsCompleted = Object.values(meals).filter(Boolean).length;

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    setStatus(null);
    try {
      await api.submitDailyLog(
        {
          logDate: today,
          dayNumber,
          breakfastDone: meals.breakfast,
          lunchDone: meals.lunch,
          dinnerDone: meals.dinner,
          snack1Done: meals.morningSnack,
          snack2Done: meals.afternoonSnack,
          waterLitres: parseFloat(water) || undefined,
          mealNotes: notes || undefined,
          exerciseDone,
          exerciseDuration: exerciseDuration ? parseInt(exerciseDuration) : undefined,
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          energyLevel: energyLevel || undefined,
          mood: mood || undefined,
        },
        accessToken,
      );
      setStatus({ type: "ok", msg: "Saved successfully" });
    } catch (e) {
      setStatus({ type: "err", msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-pad" style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>Loading…</div>;

  return (
    <div className="page-pad">
      <div className="mb-4">
        <div className="text-sm text-secondary font-medium">{dateLabel}</div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>Today's Tracker</h1>
        <div className="text-sm text-muted mt-2">Day {dayNumber} · {mealsCompleted}/5 meals logged</div>
      </div>

      {/* Progress */}
      <div className="card flex items-center gap-4 mb-4">
        <div style={{ flex: 1 }}>
          <div className="section-label">Meals Completed</div>
          <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: 6, width: `${(mealsCompleted / 5) * 100}%`, background: "var(--color-primary)", borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
        </div>
        <span style={{ fontSize: 22, fontWeight: 600, color: mealsCompleted === 5 ? "var(--color-success)" : "var(--color-text-primary)" }}>{mealsCompleted}/5</span>
      </div>

      {/* Meals */}
      <div className="section-label">Meals from your plan</div>
      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        {MEAL_KEYS.map((key) => {
          const meal = dietDay?.meals?.[key] as { name?: string; calories?: number } | undefined;
          return (
            <CheckItem
              key={key}
              icon={MEAL_ICONS[key] ?? <Utensils size={16} strokeWidth={1.5} />}
              label={meal?.name ?? MEAL_LABELS[key] ?? key}
              sub={meal?.calories ? `${meal.calories} kcal` : undefined}
              checked={meals[key]}
              onToggle={() => setMeals((p) => ({ ...p, [key]: !p[key] }))}
            />
          );
        })}
      </div>

      {/* Exercise */}
      <div className="section-label">Exercise</div>
      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        <CheckItem
          icon={<Dumbbell size={16} strokeWidth={1.5} />}
          label={exerciseDay?.isRestDay ? "Rest Day" : `Workout${exerciseDay?.totalDurationMinutes ? ` (${exerciseDay.totalDurationMinutes} min planned)` : ""}`}
          checked={exerciseDone}
          onToggle={() => setExerciseDone((p) => !p)}
        />
        {exerciseDone && (
          <div style={{ padding: "14px 16px" }}>
            <label htmlFor="exDur">Actual duration (minutes)</label>
            <input id="exDur" type="number" value={exerciseDuration} onChange={(e) => setExerciseDuration(e.target.value)} placeholder="e.g. 30" />
          </div>
        )}
      </div>

      {/* Water */}
      <div className="section-label">Water intake</div>
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Droplet size={24} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
          <input
            type="number"
            value={water}
            onChange={(e) => setWater(e.target.value)}
            step="1"
            style={{ flex: 1, border: "none", padding: 0, fontSize: 26, fontWeight: 600, color: "var(--color-text-primary)" }}
          />
          <span className="text-sm text-secondary font-medium">fl oz</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["34", "51", "68", "84", "101", "118"].map((v) => (
            <button
              key={v}
              onClick={() => setWater(v)}
              style={{
                minHeight: 0,
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${water === v ? "var(--color-primary)" : "var(--color-border)"}`,
                background: water === v ? "var(--color-primary-subtle)" : "var(--color-surface)",
                color: water === v ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {v} oz
            </button>
          ))}
        </div>
      </div>

      {/* Biometrics */}
      <div className="section-label">Biometrics</div>
      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <label htmlFor="weight">Weight (lb)</label>
          <input id="weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 160" step="0.1" />
        </div>
        <RatingRow label="Energy Level" value={energyLevel} onChange={setEnergyLevel} />
        <RatingRow label="Mood" value={mood} onChange={setMood} />
      </div>

      {/* Notes */}
      <div className="section-label">Notes</div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did today's meals feel? Any observations…" rows={3} style={{ marginBottom: 16 }} />

      {status && <div className="mb-3"><Alert variant={status.type === "ok" ? "success" : "error"}>{status.msg}</Alert></div>}

      <Button block loading={saving} disabled={!accessToken} onClick={handleSave}>
        {saving ? "Saving…" : "Save Today's Log"}
      </Button>
    </div>
  );
}
