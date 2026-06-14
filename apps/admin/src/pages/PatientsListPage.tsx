import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Users, ArrowRight } from "lucide-react";

import { api } from "../lib/api";
import { Avatar, Badge, Button, Card, EmptyState, Skeleton } from "../components/ui";

const PAGE_SIZE = 10;

export function PatientsListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["patients"], queryFn: api.getPatients });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const patients = (data?.patients ?? []) as Record<string, unknown>[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.firstName ?? ""} ${p.lastName ?? ""} ${p.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [patients, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <Search
            size={18}
            strokeWidth={1.5}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
          />
          <input
            placeholder="Search patients…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <Button leftIcon={<UserPlus size={18} strokeWidth={1.5} />} onClick={() => navigate("/patients/create")}>
          Add Patient
        </Button>
      </div>

      <Card flush>
        {isLoading ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={44} />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={<Users size={26} strokeWidth={1.5} />}
            title="No patients yet"
            subtitle="Create your first patient to get started"
            action={<Button onClick={() => navigate("/patients/create")}>Add First Patient</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={26} strokeWidth={1.5} />} title="No matches" subtitle={`Nothing matched “${search}”`} />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((patient) => {
                  const id = String(patient.id);
                  const active = patient.isActive !== false;
                  return (
                    <tr key={id} className="clickable" onClick={() => navigate(`/patients/${id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar firstName={String(patient.firstName)} lastName={String(patient.lastName)} />
                          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {String(patient.firstName)} {String(patient.lastName)}
                          </span>
                        </div>
                      </td>
                      <td className="text-secondary text-sm">{String(patient.email)}</td>
                      <td>
                        <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/patients/${id}`)}>
                          View <ArrowRight size={14} strokeWidth={1.5} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              className="flex items-center justify-between"
              style={{ padding: "14px 20px", borderTop: "1px solid var(--color-border)" }}
            >
              <span className="text-sm text-muted">
                {filtered.length} patient{filtered.length === 1 ? "" : "s"} · Page {current + 1} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
