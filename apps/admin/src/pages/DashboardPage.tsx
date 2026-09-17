import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, ClipboardCheck, CalendarPlus, Hourglass, UserPlus, ArrowRight, Sprout, AlertTriangle } from "lucide-react";

import { api } from "../lib/api";
import { DISENGAGED_DAYS, getPlanDate, isDisengaged } from "../lib/patientInsights";
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, StatCard } from "../components/ui";

const ICON = { size: 22, strokeWidth: 1.5 } as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["patients"], queryFn: api.getPatients });

  const patients = (data?.patients ?? []) as Record<string, unknown>[];
  const totalPatients = patients.length;
  const withPlans = patients.filter((p) => p.generatedPlan).length;
  const today = new Date().toDateString();
  const plansToday = patients.filter((p) => getPlanDate(p)?.toDateString() === today).length;
  const awaitingPlan = patients.filter((p) => !p.generatedPlan).length;
  const disengaged = patients.filter(isDisengaged).length;

  const stats = [
    {
      icon: <Users {...ICON} />,
      value: totalPatients,
      label: "Total Patients",
      title: "All patients in your clinic — click to view the full list",
      to: "/patients",
    },
    {
      icon: <ClipboardCheck {...ICON} />,
      value: withPlans,
      label: "Active Plans",
      title: "Patients who have a generated 90-day plan — click to view them",
      to: "/patients?plan=with",
    },
    {
      icon: <CalendarPlus {...ICON} />,
      value: plansToday,
      label: "Plans Generated Today",
      title: "Plans generated today specifically — click to view them",
      to: "/patients?plan=today",
    },
    {
      icon: <Hourglass {...ICON} />,
      value: awaitingPlan,
      label: "Awaiting Plan",
      title: "Patients who don't have a plan generated yet — click to view them",
      to: "/patients?plan=without",
    },
    {
      icon: <AlertTriangle {...ICON} />,
      value: disengaged,
      label: "Disengaged Patients",
      title: `Patients with a plan who haven't logged anything in ${DISENGAGED_DAYS}+ days — click to view them`,
      to: "/patients?plan=disengaged",
    },
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
      <div className="grid-stats mb-4" style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <StatCard
            key={s.label}
            icon={s.icon}
            value={isLoading ? "—" : s.value}
            label={s.label}
            title={s.title}
            onClick={() => navigate(s.to)}
          />
        ))}
      </div>

      {/* Recent patients */}
      <div style={{ display: "grid", gap: 20, alignItems: "start" }}>
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
                    <td>{p.generatedPlan ? <Badge variant="success">Generated</Badge> : <Badge variant="neutral">No plan</Badge>}</td>
                    <td style={{ textAlign: "right" }}>
                      <ArrowRight size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
