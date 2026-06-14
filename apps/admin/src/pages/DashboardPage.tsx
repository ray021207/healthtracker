import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, ClipboardCheck, CalendarPlus, Hourglass, UserPlus, Sparkles, FileText, ScrollText, ArrowRight, Sprout } from "lucide-react";

import { api } from "../lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, StatCard } from "../components/ui";

const ICON = { size: 22, strokeWidth: 1.5 } as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboard });

  const patients = (data?.patients ?? []) as Record<string, unknown>[];
  const totalPatients = patients.length;
  const withPlans = patients.filter((p) => p.plan).length;
  const today = new Date().toDateString();
  const plansToday = patients.filter(
    (p) => p.plan && p.planGeneratedAt && new Date(String(p.planGeneratedAt)).toDateString() === today,
  ).length;
  const pendingReviews = patients.filter((p) => !p.plan).length;

  const stats = [
    { icon: <Users {...ICON} />, value: totalPatients, label: "Total Patients" },
    { icon: <ClipboardCheck {...ICON} />, value: withPlans, label: "Active Plans" },
    { icon: <CalendarPlus {...ICON} />, value: plansToday, label: "Plans Generated Today" },
    { icon: <Hourglass {...ICON} />, value: pendingReviews, label: "Pending Reviews" },
  ];

  const quickActions = [
    { icon: <UserPlus size={18} strokeWidth={1.5} />, label: "Create Patient", to: "/patients/create" },
    { icon: <Sparkles size={18} strokeWidth={1.5} />, label: "Generate Plan", to: "/plans/generate" },
    { icon: <FileText size={18} strokeWidth={1.5} />, label: "View a Plan", to: "/plans/view" },
    { icon: <ScrollText size={18} strokeWidth={1.5} />, label: "Audit Logs", to: "/audit-logs" },
  ];

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div>
          <h1>Welcome back</h1>
          <p className="subtitle">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Button leftIcon={<UserPlus size={18} strokeWidth={1.5} />} onClick={() => navigate("/patients/create")}>
          Add Patient
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid-4 mb-4" style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={isLoading ? "—" : s.value} label={s.label} />
        ))}
      </div>

      {/* Recent patients + quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 20, alignItems: "start" }}>
        <Card flush>
          <div className="card-header" style={{ padding: "20px 24px 0" }}>
            <h2>Recent Patients</h2>
            <p>Click a patient to view details and manage their plan</p>
          </div>

          {isLoading ? (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={40} />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <EmptyState
              icon={<Sprout size={26} strokeWidth={1.5} />}
              title="No patients yet"
              subtitle="Create your first patient to get started"
              action={<Button onClick={() => navigate("/patients/create")}>Add First Patient</Button>}
            />
          ) : (
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {patients.slice(0, 8).map((p) => (
                  <tr key={p.id as string} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar firstName={p.firstName as string} lastName={p.lastName as string} size={34} />
                        <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {p.firstName as string} {p.lastName as string}
                        </span>
                      </div>
                    </td>
                    <td className="text-secondary text-sm">{p.email as string}</td>
                    <td>{p.plan ? <Badge variant="success">Generated</Badge> : <Badge variant="neutral">No plan</Badge>}</td>
                    <td style={{ textAlign: "right" }}>
                      <ArrowRight size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quickActions.map((a) => (
              <button
                key={a.to}
                type="button"
                className="btn btn-secondary w-full"
                style={{ justifyContent: "flex-start" }}
                onClick={() => navigate(a.to)}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
