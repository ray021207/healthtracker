import { Card, EmptyState } from "./ui";
import { shortDate, type FoodLogDay } from "../lib/nutrition";
import { Utensils } from "lucide-react";

const MEALS = [
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
  { key: "SNACK", label: "Snacks" },
] as const;

const SOURCE_LABEL = { MANUAL: "typed in", AI_TEXT: "AI estimate", AI_PHOTO: "AI photo estimate" } as const;

// Read-only view of what the patient logged, newest day first.
export function FoodLogView({ days, loading, targetCalories }: { days: FoodLogDay[]; loading: boolean; targetCalories?: number }) {
  return (
    <Card>
      <div className="card-header">
        <h2>Food Log</h2>
        <p>What the patient logged. Calories and nutrients are AI estimates unless typed in.</p>
      </div>

      {loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : days.length === 0 ? (
        <EmptyState icon={<Utensils size={26} strokeWidth={1.5} />} title="No food logged yet" subtitle="Entries appear here once the patient starts logging meals." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {days.map((day, index) => (
            <details key={day.date} open={index === 0} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 600 }}>
                <span>{shortDate(day.date)}</span>
                <span className="text-sm text-secondary" style={{ fontWeight: 500 }}>
                  {day.summary.totals.calories} kcal
                  {targetCalories ? ` · ${Math.round((day.summary.totals.calories / targetCalories) * 100)}% of target` : ""}
                  {" · "}C {Math.round(day.summary.totals.carbsG)} P {Math.round(day.summary.totals.proteinG)} F {Math.round(day.summary.totals.fatG)} g
                </span>
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {MEALS.map(({ key, label }) => {
                  const entries = day.entries.filter((e) => e.mealType === key);
                  if (entries.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>
                        {label} · {Math.round(entries.reduce((sum, e) => sum + e.calories, 0))} kcal
                      </div>
                      {entries.map((e) => (
                        <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 14 }}>
                          <span>
                            {e.name} <span className="text-muted">· {e.quantity} {e.unit}</span>
                          </span>
                          <span className="text-secondary" style={{ whiteSpace: "nowrap" }}>
                            {Math.round(e.calories)} kcal
                            <span className="text-xs text-muted"> · {SOURCE_LABEL[e.source]}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
