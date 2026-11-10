import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "./ui";
import { PLATE_LABELS, shortDate, type NutritionAdherence as Adherence } from "../lib/nutrition";

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-card">
      <div>
        <div className="value" style={{ fontSize: 22 }}>{value}</div>
        <div className="label">{label}</div>
      </div>
    </div>
  );
}

// Adherence to the clinician-set targets, computed from what the patient actually logged.
export function NutritionAdherence({ data }: { data: Adherence }) {
  const target = data.targets?.dailyCalorieTarget;
  const chart = data.series.map((d) => ({ date: shortDate(d.date), calories: d.calories }));

  return (
    <Card>
      <div className="card-header">
        <h2>Nutrition Adherence</h2>
        <p>
          Last {data.windowDays} days, from logged food. A day is on target when calories are within ±{data.tolerancePercent}% of the
          daily target{target ? ` (${target} kcal)` : ""}.
        </p>
      </div>

      {data.daysLogged === 0 ? (
        <p className="text-sm text-secondary">No food logged in this period yet.</p>
      ) : (
        <>
          <div className="grid-3">
            <Tile value={`${data.daysLogged}`} label="Days with food logged" />
            <Tile value={data.onTargetPercent == null ? "—" : `${data.daysOnTarget} of ${data.daysLogged} (${data.onTargetPercent}%)`} label="Days on calorie target" />
            <Tile value={`${data.avgCalories} kcal`} label={`Average per day (${pct(data.avgCaloriePercent)} of target)`} />
          </div>

          <div className="grid-3" style={{ marginTop: 16 }}>
            <Tile value={pct(data.avgCarbsPercent)} label="Avg carbs vs target" />
            <Tile value={pct(data.avgProteinPercent)} label="Avg protein vs target" />
            <Tile value={pct(data.avgFatPercent)} label="Avg fat vs target" />
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="text-xs text-muted" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Plate method, average zone completion
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {data.avgPlateCompletion.map((z) => (
                <div key={z.category}>
                  <div className="flex items-center" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span>{PLATE_LABELS[z.category] ?? z.category}</span>
                    <span className="text-secondary">{z.completionPercent}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: 6, width: `${z.completionPercent}%`, background: "var(--color-primary-light)", borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: "100%", height: 220, marginTop: 20 }}>
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ left: 8, right: 12, top: 8, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} width={48} domain={[0, "auto"]} />
                {target != null && <ReferenceLine y={target} stroke="#4CAF82" strokeDasharray="4 4" label={{ value: "target", fontSize: 11, fill: "var(--color-text-muted)", position: "insideTopRight" }} />}
                <Tooltip formatter={(v: number) => [`${v} kcal`, "Logged"]} />
                <Line type="monotone" dataKey="calories" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
