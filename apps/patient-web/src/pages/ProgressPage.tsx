import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, CalendarCheck, Target, TrendingUp } from "lucide-react";

import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Button, Card, EmptyState, Skeleton } from "../components/ui";

type Progress = { totalLoggedDays: number; adherencePercent: number; currentStreakDays: number };

function AdherenceRing({ percent }: { percent: number }) {
  const size = 160;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-primary-subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: -1 }}>{Math.round(pct)}%</div>
        <div className="text-xs text-muted">adherence</div>
      </div>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="card flex items-center gap-3" style={{ flex: 1 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-md)",
          background: "var(--color-primary-subtle)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}>{value}</div>
        <div className="text-xs text-muted mt-2" style={{ marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    api.getProgress(accessToken).then((r) => r && setProgress(r.progress)).finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="page-pad">
      <div className="mb-4">
        <div className="text-sm text-secondary font-medium">Your journey</div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>Progress</h1>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton height={200} radius={16} />
          <Skeleton height={80} radius={16} />
        </div>
      ) : !progress || (progress.totalLoggedDays === 0 && progress.adherencePercent === 0 && progress.currentStreakDays === 0) ? (
        <Card>
          <EmptyState
            icon={<TrendingUp size={26} strokeWidth={1.5} />}
            title="No progress yet"
            subtitle="Log your first day to start tracking adherence and streaks."
            action={<Button onClick={() => navigate("/track")}>Log Today</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="mb-4" style={{ display: "flex", justifyContent: "center", padding: "32px 20px" }}>
            <AdherenceRing percent={progress.adherencePercent} />
          </Card>

          <div className="flex gap-3">
            <StatTile icon={<Flame size={22} strokeWidth={1.5} />} value={`${progress.currentStreakDays}d`} label="Current streak" />
            <StatTile icon={<CalendarCheck size={22} strokeWidth={1.5} />} value={progress.totalLoggedDays} label="Days logged" />
          </div>

          <div className="mt-4">
            <Card>
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-primary-subtle)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Target size={22} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: "var(--color-text-primary)" }}>Keep it up</div>
                  <div className="text-sm text-secondary">Log every day to grow your streak and adherence.</div>
                </div>
                <Button variant="secondary" onClick={() => navigate("/track")} style={{ minHeight: 40 }}>
                  Log Today
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
