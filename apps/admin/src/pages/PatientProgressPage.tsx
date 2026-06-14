import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";

import { api } from "../lib/api";
import { Button, Card, EmptyState, Skeleton } from "../components/ui";

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function PatientProgressPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["progress", id],
    queryFn: () => api.getProgress(id),
    enabled: Boolean(id),
  });

  const progress = (data?.progress ?? {}) as Record<string, unknown>;
  const entries = Object.entries(progress);
  const scalars = entries.filter(([, v]) => v == null || typeof v !== "object");
  const objects = entries.filter(([, v]) => v != null && typeof v === "object");

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Logged metrics and adherence over the wellness programme</p>
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} strokeWidth={1.5} />} onClick={() => navigate(`/patients/${id}`)}>
          Back
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={28} />
            ))}
          </div>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState icon={<Activity size={26} strokeWidth={1.5} />} title="No progress recorded yet" subtitle="Metrics will appear here once the patient starts logging." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {scalars.length > 0 && (
            <div className="grid-3">
              {scalars.map(([key, value]) => (
                <div className="stat-card" key={key}>
                  <div>
                    <div className="value" style={{ fontSize: 22 }}>{value == null ? "—" : String(value)}</div>
                    <div className="label">{humanize(key)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {objects.map(([key, value]) => (
            <Card key={key}>
              <div className="card-header"><h2>{humanize(key)}</h2></div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-md)",
                  padding: 16,
                  overflowX: "auto",
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(value, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
