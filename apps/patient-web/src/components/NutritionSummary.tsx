import type { DaySummary } from "../lib/api";

function Ring({ value, target }: { value: number; target: number }) {
  const size = 124;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} of ${target} calories`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-text-primary)">
        {value}
      </text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">
        {target > 0 ? `of ${target} kcal` : "kcal"}
      </text>
    </svg>
  );
}

function MacroBar({ label, grams, target }: { label: string; grams: number; target: number | undefined }) {
  const pct = target ? Math.min(100, (grams / target) * 100) : 0;
  return (
    <div>
      <div className="flex items-center" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span className="text-secondary">
          {Math.round(grams)}
          {target ? ` / ${Math.round(target)}` : ""} g
        </span>
      </div>
      <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: 6, width: `${pct}%`, background: "var(--color-primary-light)", borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

export function NutritionSummary({ summary }: { summary: DaySummary | null }) {
  const totals = summary?.totals ?? { calories: 0, carbsG: 0, proteinG: 0, fatG: 0 };
  const targets = summary?.targets ?? null;
  const remaining = targets ? targets.dailyCalorieTarget - totals.calories : null;

  return (
    <div className="card mb-4">
      <div className="flex items-center gap-4">
        <Ring value={totals.calories} target={targets?.dailyCalorieTarget ?? 0} />
        <div style={{ flex: 1, display: "grid", gap: 10 }}>
          <MacroBar label="Carbs" grams={totals.carbsG} target={targets?.dailyCarbsG} />
          <MacroBar label="Protein" grams={totals.proteinG} target={targets?.dailyProteinG} />
          <MacroBar label="Fat" grams={totals.fatG} target={targets?.dailyFatG} />
        </div>
      </div>
      <div className="text-xs text-muted" style={{ marginTop: 12 }}>
        {targets
          ? remaining !== null && remaining >= 0
            ? `${remaining} kcal left today · targets set by your care team`
            : `${Math.abs(remaining ?? 0)} kcal over today's target`
          : "Your care team hasn't set daily targets yet."}
      </div>
    </div>
  );
}
