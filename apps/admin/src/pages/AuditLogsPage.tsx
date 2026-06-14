import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";

import { api, type AuditLog } from "../lib/api";
import { Badge, Card, EmptyState, SelectInput, Skeleton } from "../components/ui";

type BadgeVariant = "primary" | "success" | "warning" | "error" | "info" | "neutral";

/* Map an action string to a semantic badge colour:
   view → info, edit/update → warning, generate/create → primary, delete → error */
function actionVariant(action: string): BadgeVariant {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("remove")) return "error";
  if (a.includes("generate") || a.includes("create")) return "primary";
  if (a.includes("edit") || a.includes("update") || a.includes("change")) return "warning";
  if (a.includes("view") || a.includes("read") || a.includes("login")) return "info";
  return "neutral";
}

export function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.getAuditLogs({ limit: 100 }),
  });
  const [actionFilter, setActionFilter] = useState("");

  const logs = data?.logs ?? [];
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const filtered = actionFilter ? logs.filter((l) => l.action === actionFilter) : logs;

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Full activity trail for your clinic — every action, every actor</p>
        <div style={{ minWidth: 220 }}>
          <SelectInput value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </SelectInput>
        </div>
      </div>

      <Card flush>
        {isLoading ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={36} />
            ))}
          </div>
        ) : !filtered.length ? (
          <EmptyState icon={<ScrollText size={26} strokeWidth={1.5} />} title="No audit logs yet" subtitle="Activity will appear here as actions are taken." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Resource</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: AuditLog) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <code style={{ fontFamily: "monospace", fontSize: 12, background: "var(--color-bg)", padding: "2px 6px", borderRadius: 4, color: "var(--color-text-primary)" }}>
                        {log.actorId.slice(0, 8)}…
                      </code>
                    </td>
                    <td>
                      <Badge variant={log.actorRole === "admin" ? "primary" : "neutral"}>{log.actorRole}</Badge>
                    </td>
                    <td>
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="text-sm text-secondary">
                      {log.resourceType}
                      {log.resourceId ? <span style={{ opacity: 0.6 }}> / {log.resourceId.slice(0, 8)}…</span> : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
