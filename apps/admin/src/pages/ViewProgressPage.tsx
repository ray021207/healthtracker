import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";

import { api } from "../lib/api";
import { Button, Card, SelectInput } from "../components/ui";

export function ViewProgressPage() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");

  const { data } = useQuery({ queryKey: ["patients"], queryFn: api.getPatients });
  const patients = (data?.patients ?? []) as Record<string, unknown>[];

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Pick a patient to review their tracking progress</p>
      </div>

      <Card style={{ maxWidth: 520 }}>
        <div className="flex items-center gap-2 mb-3" style={{ color: "var(--color-primary)" }}>
          <TrendingUp size={20} strokeWidth={1.5} />
          <h2 style={{ margin: 0 }}>View Progress</h2>
        </div>
        <SelectInput
          label="Patient"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          hint={patients.length === 0 ? "No patients found — create one first." : undefined}
        >
          <option value="">Choose a patient…</option>
          {patients.map((p) => (
            <option key={String(p.id)} value={String(p.id)}>
              {String(p.firstName)} {String(p.lastName)} — {String(p.email)}
            </option>
          ))}
        </SelectInput>
        <div className="flex justify-end mt-4">
          <Button disabled={!patientId} onClick={() => navigate(`/patients/${patientId}/progress`)}>
            View Progress <ArrowRight size={16} strokeWidth={1.5} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
