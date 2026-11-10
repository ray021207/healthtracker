import type { DaySummary } from "../lib/api";
import { PLATE_COLORS } from "../lib/food";

const CX = 110;
const CY = 110;
const R = 100;

const point = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
};

// Pie sector from angle a0 to a1 (degrees, 0 = right, clockwise). The zones are a half and two quarters.
const sector = (r: number, a0: number, a1: number) =>
  `M${CX} ${CY} L${point(r, a0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${point(r, a1)} Z`;

const ZONES = [
  { category: "NONSTARCHY_VEG", label: "Veggies", a0: 90, a1: 270, color: PLATE_COLORS.NONSTARCHY_VEG, labelAt: [60, 110] },
  { category: "PROTEIN", label: "Protein", a0: 270, a1: 360, color: PLATE_COLORS.PROTEIN, labelAt: [150, 62] },
  { category: "CARB", label: "Carbs", a0: 0, a1: 90, color: PLATE_COLORS.CARB, labelAt: [150, 160] },
] as const;

const halo = { paintOrder: "stroke", stroke: "var(--color-surface)", strokeWidth: 3, strokeLinejoin: "round" } as const;

/**
 * Plate-method view of the day: half non-starchy vegetables, a quarter protein, a quarter
 * carbohydrate, plus a glass for water. Each zone fills up as the patient logs, and the
 * percentage is how much of that zone's goal share has been reached.
 */
export function PlateChart({ summary, waterOz, waterGoalOz }: { summary: DaySummary | null; waterOz: number; waterGoalOz: number }) {
  const zoneData = (category: string) => summary?.plate.zones.find((z) => z.category === category);
  const waterPct = waterGoalOz > 0 ? Math.min(100, Math.round((waterOz / waterGoalOz) * 100)) : 0;

  return (
    <div>
      <svg viewBox="0 0 270 220" role="img" aria-label="Plate method progress" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
        <circle cx={CX} cy={CY} r={R + 8} fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="2" />

        {ZONES.map((z) => {
          const d = zoneData(z.category);
          const pct = d?.completionPercent ?? 0;
          return (
            <g key={z.category}>
              <path d={sector(R, z.a0, z.a1)} fill={z.color} opacity={0.14} />
              {pct > 0 && <path d={sector(R * (pct / 100), z.a0, z.a1)} fill={z.color} opacity={0.9} />}
              <path d={sector(R, z.a0, z.a1)} fill="none" stroke="var(--color-surface)" strokeWidth="3" />
              <text x={z.labelAt[0]} y={z.labelAt[1] - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-text-primary)" style={halo}>
                {pct}%
              </text>
              <text x={z.labelAt[0]} y={z.labelAt[1] + 12} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text-primary)" style={halo}>
                {z.label}
              </text>
            </g>
          );
        })}

        {/* water glass */}
        <g>
          <rect x="222" y="28" width="38" height="64" rx="6" fill={PLATE_COLORS.WATER} opacity={0.14} />
          <rect x="222" y={92 - 64 * (waterPct / 100)} width="38" height={64 * (waterPct / 100)} rx="6" fill={PLATE_COLORS.WATER} opacity={0.9} />
          <rect x="222" y="28" width="38" height="64" rx="6" fill="none" stroke="var(--color-border)" strokeWidth="2" />
          <text x="241" y="116" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-text-primary)">
            {waterPct}%
          </text>
          <text x="241" y="131" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text-secondary)">
            Water
          </text>
        </g>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
        {ZONES.map((z) => {
          const d = zoneData(z.category);
          return (
            <div key={z.category} style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: z.color, marginRight: 6 }} />
              {z.label}
              <div style={{ color: "var(--color-text-muted)", marginTop: 2 }}>
                {d?.sharePercent ?? 0}% of plate · goal {d?.goalSharePercent ?? 0}%
              </div>
            </div>
          );
        })}
      </div>
      {(!summary || summary.plate.totalVolumeCups === 0) && (
        <div className="text-xs text-muted" style={{ textAlign: "center", marginTop: 10 }}>
          Log what you eat and your plate fills in.
        </div>
      )}
    </div>
  );
}
