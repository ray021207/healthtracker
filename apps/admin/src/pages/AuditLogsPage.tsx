import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ScrollText, Trash2 } from "lucide-react";

import { api, type AuditLog } from "../lib/api";
import { Alert, Badge, Button, Card, EmptyState, SelectInput, Skeleton } from "../components/ui";

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
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.getAuditLogs({ limit: 100 }),
  });
  const [actionFilter, setActionFilter] = useState("");
  const [archiveDays, setArchiveDays] = useState<"30" | "90">("90");
  const [status, setStatus] = useState<{ text: string; variant: "success" | "error" | "info" } | null>(null);

  const archiveMutation = useMutation({
    mutationFn: () => api.archiveAuditLogs(Number(archiveDays)),
    onSuccess: (result) => {
      setStatus({ text: `Archived ${result.deletedCount} old logs (older than ${archiveDays} days).`, variant: "success" });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error) => {
      setStatus({ text: error instanceof Error ? error.message : "Archive failed", variant: "error" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api.clearAuditLogs(),
    onSuccess: (result) => {
      setStatus({ text: `Cleared ${result.deletedCount} audit logs.`, variant: "success" });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error) => {
      setStatus({ text: error instanceof Error ? error.message : "Clear failed", variant: "error" });
    },
  });

  const logs = data?.logs ?? [];
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const filtered = actionFilter ? logs.filter((l) => l.action === actionFilter) : logs;

  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <p className="subtitle">Full activity trail for your clinic — every action, every actor</p>
        <div className="flex items-center gap-2" style={{ minWidth: 220 }}>
          <SelectInput value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </SelectInput>
          <Button
            variant="secondary"
            loading={archiveMutation.isPending}
            onClick={() => {
              const ok = window.confirm(`Archive logs older than ${archiveDays} days? This removes them from the active audit list.`);
              if (!ok) return;
              archiveMutation.mutate();
            }}
          >
            <Archive size={15} strokeWidth={1.5} /> Archive
          </Button>
          <SelectInput value={archiveDays} onChange={(e) => setArchiveDays(e.target.value as "30" | "90") }>
            <option value="30">Older than 30 days</option>
            <option value="90">Older than 90 days</option>
          </SelectInput>
          <Button
            variant="destructive"
            loading={clearMutation.isPending}
            onClick={() => {
              const ok = window.confirm("Clear all audit logs for this clinic? This cannot be undone.");
              if (!ok) return;
              clearMutation.mutate();
            }}
          >
            <Trash2 size={15} strokeWidth={1.5} /> Clear logs
          </Button>
        </div>
      </div>

      <Card>
        <p className="text-sm text-secondary" style={{ lineHeight: 1.65 }}>
          Audit logs are tamper-evident activity records showing who did what, when, and to which resource.
          They are used for compliance, security reviews, and operational debugging in the admin portal.
        </p>
      </Card>

      {status && <Alert variant={status.variant}>{status.text}</Alert>}

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
                      <Badge variant={log.actorRole === "ADMIN" ? "primary" : "neutral"}>{log.actorRole}</Badge>
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
