import { useEffect, useState } from "react";
import { Check, Dumbbell, Droplet, Plus, Trash2 } from "lucide-react";

import { useAuth } from "../lib/auth";
import { api, type DietDay, type ExerciseDay, type FoodDay, type MealType } from "../lib/api";
import { MEAL_TYPES } from "../lib/food";
import { Alert, Button } from "../components/ui";
import { FoodSheet } from "../components/FoodSheet";
import { GlucoseCard } from "../components/GlucoseCard";
import { NutritionSummary } from "../components/NutritionSummary";
import { PlateChart } from "../components/PlateChart";

const PLAN_MEALS = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"] as const;
const PLAN_MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", morningSnack: "Morning snack", lunch: "Lunch", afternoonSnack: "Afternoon snack", dinner: "Dinner" };
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
  // The patient's local calendar day (en-CA formats as YYYY-MM-DD). toISOString() would be UTC,
  // which files an evening log under tomorrow for anyone west of Greenwich.
  const today = new Date().toLocaleDateString("en-CA");
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const [dietDay, setDietDay] = useState<DietDay | null>(null);
  const [exerciseDay, setExerciseDay] = useState<ExerciseDay | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [food, setFood] = useState<FoodDay | null>(null);
  const [sheetMeal, setSheetMeal] = useState<MealType | null>(null);
  const [exerciseDone, setExerciseDone] = useState(false);
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [water, setWater] = useState("84");
  // The field pre-fills 84 oz, so the plate only counts water the patient has actually entered.
  const [waterLogged, setWaterLogged] = useState(false);
  const updateWater = (value: string) => {
    setWater(value);
    setWaterLogged(true);
  };
  const [weightKg, setWeightKg] = useState("");
  const [energyLevel, setEnergyLevel] = useState(0);
  const [mood, setMood] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    Promise.all([api.getTodayPlan(accessToken), api.getDailyLog(today, accessToken), api.getFood(today, accessToken).catch(() => null)]).then(([todayPlan, logRes, foodRes]) => {
      if (foodRes) setFood(foodRes);
      if (todayPlan) {
        setDietDay(todayPlan.dietDay);
        setExerciseDay(todayPlan.exerciseDay);
        setDayNumber(todayPlan.dayNumber);
      }
      const log = logRes?.log as Record<string, unknown> | null;
      if (log) {
        setExerciseDone(!!log.exerciseDone);
        if (log.exerciseDuration) setExerciseDuration(String(log.exerciseDuration));
        if (log.waterLitres) {
          setWater(String(Math.round(toStoredWaterOz(Number(log.waterLitres)))));
          setWaterLogged(true);
        }
        if (log.weightKg) setWeightKg(String(log.weightKg));
        if (log.energyLevel) setEnergyLevel(log.energyLevel as number);
        if (log.mood) setMood(log.mood as number);
        if (log.mealNotes) setNotes(log.mealNotes as string);
      }
    }).finally(() => setLoading(false));
  }, [accessToken]);

  const summary = food?.summary ?? null;
  const mealCount = (type: MealType) => summary?.byMeal[type].count ?? 0;
  const mealsLogged = MEAL_TYPES.filter((m) => mealCount(m.value) > 0).length;
  const waterGoalOz = Math.round(dietDay?.hydrationLitres ? dietDay.hydrationLitres * OZ_PER_LITRE : 64);

  const removeFood = async (id: string) => {
    if (!accessToken) return;
    try {
      setFood(await api.deleteFood(id, accessToken));
    } catch (e) {
      setStatus({ type: "err", msg: e instanceof Error ? e.message : "Could not remove that item" });
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    setStatus(null);
    try {
      await api.submitDailyLog(
        {
          logDate: today,
          dayNumber,
          // Meal flags follow what was actually logged (the server keeps them in step as well).
          breakfastDone: mealCount("BREAKFAST") > 0,
          lunchDone: mealCount("LUNCH") > 0,
          dinnerDone: mealCount("DINNER") > 0,
          snack1Done: mealCount("SNACK") > 0,
          snack2Done: mealCount("SNACK") > 1,
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
        <div className="text-sm text-muted mt-2">Day {dayNumber} · {summary ? summary.totals.calories : 0} kcal logged</div>
      </div>

      <NutritionSummary summary={summary} />

      {/* Plate method */}
      <div className="section-label">Your plate today</div>
      <div className="card mb-4">
        <PlateChart summary={summary} waterOz={waterLogged ? parseFloat(water) || 0 : 0} waterGoalOz={waterGoalOz} />
      </div>

      {/* Food log */}
      <div className="section-label">What you ate</div>
      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        {MEAL_TYPES.map(({ value, label }) => {
          const entries = (food?.entries ?? []).filter((e) => e.mealType === value);
          const kcal = summary?.byMeal[value].calories ?? 0;
          return (
            <div key={value} style={{ borderBottom: "1px solid var(--color-border)", padding: "12px 16px" }}>
              <div className="flex items-center" style={{ justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
                  {entries.length > 0 && <span className="text-xs text-muted" style={{ marginLeft: 8 }}>{Math.round(kcal)} kcal</span>}
                </div>
                <button
                  onClick={() => setSheetMeal(value)}
                  disabled={!accessToken}
                  style={{ minHeight: 0, padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-primary)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Plus size={15} strokeWidth={1.75} /> Add
                </button>
              </div>
              {entries.map((e) => (
                <div key={e.id} className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>{e.name}</div>
                    <div className="text-xs text-muted">
                      {e.quantity} {e.unit} · {Math.round(e.calories)} kcal · C {Math.round(e.carbsG)} P {Math.round(e.proteinG)} F {Math.round(e.fatG)}
                    </div>
                  </div>
                  <button onClick={() => removeFood(e.id)} aria-label={`Remove ${e.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", minHeight: 0, padding: 6 }}>
                    <Trash2 size={17} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        <div className="text-xs text-muted" style={{ padding: "10px 16px" }}>
          Calories and nutrients are AI estimates, so adjust anything that looks off. {mealsLogged}/4 meal groups logged.
        </div>
      </div>

      {dietDay?.meals && (
        <details className="card mb-4">
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Meal ideas from your plan</summary>
          <div style={{ marginTop: 10 }}>
            {PLAN_MEALS.map((key) => {
              const meal = dietDay.meals?.[key] as { name?: string; calories?: number } | undefined;
              if (!meal?.name) return null;
              return (
                <div key={key} style={{ padding: "6px 0", fontSize: 14 }}>
                  <span className="text-secondary">{PLAN_MEAL_LABELS[key]}: </span>
                  {meal.name}
                  {meal.calories ? <span className="text-xs text-muted"> · {meal.calories} kcal</span> : null}
                </div>
              );
            })}
          </div>
        </details>
      )}

      {accessToken && <GlucoseCard date={today} token={accessToken} />}

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
            onChange={(e) => updateWater(e.target.value)}
            step="1"
            style={{ flex: 1, border: "none", padding: 0, fontSize: 26, fontWeight: 600, color: "var(--color-text-primary)" }}
          />
          <span className="text-sm text-secondary font-medium">fl oz</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["34", "51", "68", "84", "101", "118"].map((v) => (
            <button
              key={v}
              onClick={() => updateWater(v)}
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

      {sheetMeal && accessToken && (
        <FoodSheet mealType={sheetMeal} date={today} token={accessToken} onClose={() => setSheetMeal(null)} onSaved={setFood} />
      )}
    </div>
  );
}
