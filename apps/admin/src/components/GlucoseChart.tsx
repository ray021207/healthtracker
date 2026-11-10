import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, SelectInput } from "./ui";
import { GLUCOSE_CONTEXT_LABELS, type GlucoseContext, type GlucosePoint, type GlucoseRanges } from "../lib/nutrition";

const DOT_COLORS: Record<GlucoseContext, string> = {
  FASTING: "#4CAF82",
  BEFORE_MEAL: "#5B9BD5",
  AFTER_MEAL: "#E8A838",
  BEDTIME: "#7A72B3",
  OTHER: "#A8A3B8",
};

const stamp = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

function ContextDot(props: { cx?: number; cy?: number; payload?: { context: GlucoseContext } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return <circle cx={cx} cy={cy} r={5} fill={DOT_COLORS[payload.context]} stroke="var(--color-surface)" strokeWidth={1.5} />;
}

// Daily blood sugar line chart. Reference ranges are shaded for information only.
export function GlucoseChart({ points, ranges }: { points: GlucosePoint[]; ranges: GlucoseRanges | null }) {
  const [filter, setFilter] = useState<"ALL" | GlucoseContext>("ALL");

  const data = useMemo(
    () =>
      points
        .filter((p) => filter === "ALL" || p.context === filter)
        .map((p) => ({ label: stamp(p.measuredAt), value: p.valueMgDl, context: p.context })),
    [points, filter],
  );

  const fasting = ranges?.ranges.FASTING;
  const after = ranges?.ranges.AFTER_MEAL;
  // Keep the shaded band and the ceiling line inside the axis, otherwise the chart drops them.
  const floor = fasting?.minMgDl ?? 70;
  const ceiling = (after?.maxMgDl ?? 180) + 10;

  return (
    <Card>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2>Blood Sugar</h2>
          <p>Readings the patient logged, in mg/dL</p>
        </div>
        <div style={{ width: 170 }}>
          <SelectInput label="Show" value={filter} onChange={(e) => setFilter(e.target.value as "ALL" | GlucoseContext)}>
            <option value="ALL">All readings</option>
            {(Object.keys(GLUCOSE_CONTEXT_LABELS) as GlucoseContext[]).map((c) => (
              <option key={c} value={c}>{GLUCOSE_CONTEXT_LABELS[c]}</option>
            ))}
          </SelectInput>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-secondary">No blood sugar readings logged yet.</p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ left: 8, right: 12, top: 12, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} width={44} domain={[(min: number) => Math.floor(Math.min(min - 10, floor - 10)), (max: number) => Math.ceil(Math.max(max + 10, ceiling))]} />
              {fasting?.minMgDl != null && fasting.maxMgDl != null && (
                <ReferenceArea y1={fasting.minMgDl} y2={fasting.maxMgDl} fill="#4CAF82" fillOpacity={0.1} stroke="none" />
              )}
              {after?.maxMgDl != null && <ReferenceLine y={after.maxMgDl} stroke="#E8A838" strokeDasharray="4 4" />}
              <Tooltip
                formatter={(value: number, _name, item) => [
                  `${value} mg/dL`,
                  GLUCOSE_CONTEXT_LABELS[(item?.payload?.context as GlucoseContext) ?? "OTHER"],
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={<ContextDot />}
                isAnimationActive={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
        {(Object.keys(DOT_COLORS) as GlucoseContext[]).map((c) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: DOT_COLORS[c] }} />
            {GLUCOSE_CONTEXT_LABELS[c]}
          </span>
        ))}
      </div>
      {ranges && (
        <p className="text-xs text-muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Reference ranges ({ranges.isDiabetic ? "patient flagged diabetic" : "patient not flagged diabetic"}):
          {fasting && ` fasting ${fasting.text}`}
          {after && `; after a meal ${after.text}`}. Shaded band = fasting range; dashed line = after-meal ceiling. For information only.
        </p>
      )}
    </Card>
  );
}
