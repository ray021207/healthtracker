import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Target, Sunrise, Sun, Moon, Droplet, ArrowRight, Sprout, CalendarCheck, ClipboardList, Dumbbell } from "lucide-react";

import { useAuth } from "../lib/auth";
import { api, type DietDay, type ExerciseDay } from "../lib/api";
import { Badge, Card, Skeleton } from "../components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeekStrip() {
  const today = new Date();
  const todayIdx = today.getDay();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayIdx + i);
    return { label: DAYS[i], date: d.getDate(), isToday: i === todayIdx };
  });
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", padding: "2px 0" }}>
      {days.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 42, gap: 6 }}>
          <span className="text-xs font-medium text-muted">{d.label}</span>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: d.isToday ? "var(--color-primary)" : "var(--color-surface)",
              border: d.isToday ? "none" : "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: d.isToday ? "#fff" : "var(--color-text-secondary)",
              fontSize: 13,
              fontWeight: d.isToday ? 600 : 500,
            }}
          >
            {d.date}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon, value, label, onClick }: { icon: React.ReactNode; value: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card" style={{ flex: 1, cursor: "pointer", textAlign: "left", border: "1px solid var(--color-border)" }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-md)",
          background: "var(--color-primary-subtle)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: -0.5 }}>{value}</div>
      <div className="text-xs text-muted mt-2">{label}</div>
    </button>
  );
}

export default function HomePage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [todayData, setTodayData] = useState<{ dayNumber: number; dietDay: DietDay | null; exerciseDay: ExerciseDay | null } | null>(null);
  const [progress, setProgress] = useState<{ adherencePercent: number; currentStreakDays: number; totalLoggedDays: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.getTodayPlan(accessToken).then((d) => d && setTodayData(d)),
      api.getProgress(accessToken).then((r) => r && setProgress(r.progress)),
    ]).finally(() => setLoading(false));
  }, [accessToken]);

  const dietDay = todayData?.dietDay;
  const exerciseDay = todayData?.exerciseDay;
  const dayNum = todayData?.dayNumber ?? 1;

  return (
    <div className="page-pad">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="text-sm text-secondary font-medium">{greeting}</div>
          <h1 style={{ fontSize: 26, marginTop: 2 }}>{user?.firstName ?? "Welcome"}</h1>
          {progress && (
            <div className="text-sm text-secondary mt-2">
              Day {dayNum} of 90 · {Math.round(progress.adherencePercent)}% adherence
            </div>
          )}
        </div>
      </div>

      <WeekStrip />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={100} radius={16} />
          ))}
        </div>
      ) : (
        <>
          {progress && (
            <div className="flex gap-3 mb-4">
              <MetricCard icon={<Flame size={20} strokeWidth={1.5} />} value={`${progress.currentStreakDays}d`} label="Current streak" onClick={() => navigate("/track")} />
              <MetricCard icon={<Target size={20} strokeWidth={1.5} />} value={`${Math.round(progress.adherencePercent)}%`} label="Adherence" onClick={() => navigate("/progress")} />
            </div>
          )}

          {dietDay ? (
            <Card className="mb-4" onClick={() => navigate("/plan")} style={{ cursor: "pointer" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="section-label" style={{ marginBottom: 4 }}>Today's Nutrition · Day {dayNum}</div>
                  <div style={{ fontSize: 26, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {dietDay.totalCalories ?? "—"} <span className="text-sm text-secondary font-medium">kcal</span>
                  </div>
                </div>
                <Badge variant="primary">Day {dayNum}</Badge>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dietDay.meals?.breakfast?.name && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Sunrise size={15} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} /> {dietDay.meals.breakfast.name}
                  </div>
                )}
                {dietDay.meals?.lunch?.name && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Sun size={15} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} /> {dietDay.meals.lunch.name}
                  </div>
                )}
                {dietDay.meals?.dinner?.name && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Moon size={15} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} /> {dietDay.meals.dinner.name}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3" style={{ paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Droplet size={14} strokeWidth={1.5} /> {dietDay.hydrationLitres ?? 2.5}L hydration target
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
                  View plan <ArrowRight size={14} strokeWidth={1.5} />
                </span>
              </div>
            </Card>
          ) : (
            <Card className="mb-4" onClick={() => navigate("/profile")} style={{ cursor: "pointer", textAlign: "center", padding: 28 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  margin: "0 auto 12px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sprout size={26} strokeWidth={1.5} />
              </div>
              <div className="font-semibold" style={{ color: "var(--color-text-primary)", fontSize: 16 }}>No plan generated yet</div>
              <div className="text-sm text-secondary mt-2">Generate your 90-day plan from your profile</div>
            </Card>
          )}

          {exerciseDay && (
            <Card className="mb-4">
              <div className="section-label" style={{ marginBottom: 10 }}>Today's Workout</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2" style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    <Dumbbell size={18} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
                    {exerciseDay.isRestDay ? "Rest Day" : `${exerciseDay.totalDurationMinutes ?? "—"} min`}
                  </div>
                  {!exerciseDay.isRestDay && exerciseDay.totalCaloriesBurned && (
                    <div className="text-sm text-secondary mt-2">~{exerciseDay.totalCaloriesBurned} kcal burn</div>
                  )}
                </div>
                {exerciseDay.phase && <Badge variant="primary">{exerciseDay.phase}</Badge>}
              </div>
            </Card>
          )}

          <div className="section-label">Quick Actions</div>
          <div className="flex gap-3">
            {[
              { icon: <CalendarCheck size={20} strokeWidth={1.5} />, label: "Log Today", to: "/track" },
              { icon: <ClipboardList size={20} strokeWidth={1.5} />, label: "My Plan", to: "/plan" },
              { icon: <Target size={20} strokeWidth={1.5} />, label: "Progress", to: "/progress" },
            ].map((a) => (
              <button
                key={a.to}
                onClick={() => navigate(a.to)}
                className="card"
                style={{ flex: 1, cursor: "pointer", textAlign: "center", padding: "16px 8px" }}
              >
                <div style={{ color: "var(--color-primary)", display: "flex", justifyContent: "center", marginBottom: 8 }}>{a.icon}</div>
                <div className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{a.label}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
