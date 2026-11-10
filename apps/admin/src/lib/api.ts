// In production (Vercel) this stays "" so requests hit /api/* on the same
// origin and get proxied to Render via vercel.json rewrites — this keeps the
// auth cookies same-site. Only falls back to a direct localhost URL in dev,
// or if VITE_API_URL is explicitly set (e.g. to bypass the proxy).
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:3001");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Request failed with ${res.status}`);
  }

  return (await res.json()) as T;
}

interface LoginUser {
  id: string;
  role: string;
  clinicId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
}

interface MutateCountResponse {
  deletedCount: number;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: LoginUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getPatients: () => request<{ patients: Array<Record<string, unknown>> }>("/api/admin/patients"),
  getPatient: (id: string) => request<{ patient: Record<string, unknown> }>(`/api/admin/patients/${id}`),
  createPatient: (payload: Record<string, unknown>) =>
    request<{ patient: Record<string, unknown>; credentials: { email: string; temporaryPassword: string } }>("/api/admin/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePatient: (id: string, payload: Record<string, unknown>) =>
    request<{ patient: Record<string, unknown> }>(`/api/admin/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  archivePatient: (id: string) =>
    request<{ patient: { id: string; isActive: boolean } }>(`/api/admin/patients/${id}/archive`, {
      method: "POST",
    }),
  unarchivePatient: (id: string) =>
    request<{ patient: { id: string; isActive: boolean } }>(`/api/admin/patients/${id}/unarchive`, {
      method: "POST",
    }),
  deletePatient: (id: string) =>
    request<{ message: string }>(`/api/admin/patients/${id}`, {
      method: "DELETE",
    }),
  getHealthProfile: (id: string) =>
    request<{
      healthProfile: Record<string, unknown> | null;
      suggestedTargets?: { dailyCalorieTarget: number; dailyProteinG: number; dailyCarbsG: number; dailyFatG: number } | null;
    }>(`/api/admin/patients/${id}/health-profile`),
  upsertHealthProfile: (id: string, payload: Record<string, unknown>) =>
    request<{ healthProfile: Record<string, unknown> }>(`/api/admin/patients/${id}/health-profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  generatePlan: (id: string) =>
    request<{ message: string }>(`/api/admin/patients/${id}/generate-plan`, {
      method: "POST",
    }),
  getPlan: (id: string) =>
    request<{ plan: Record<string, unknown> | null }>(`/api/admin/patients/${id}/plan`),
  getProgress: (id: string) =>
    request<{ progress: Record<string, unknown> }>(`/api/admin/patients/${id}/progress`),
  getFoodLog: (id: string, days = 14) =>
    request<{ foodLog: Array<Record<string, unknown>>; targets: Record<string, number> | null; days: number }>(
      `/api/admin/patients/${id}/food-log?days=${days}`,
    ),
  getAuditLogs: (params?: { action?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set("action", params.action);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{ logs: AuditLog[] }>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
  archiveAuditLogs: (olderThanDays = 90) =>
    request<MutateCountResponse>("/api/admin/audit-logs/archive", {
      method: "POST",
      body: JSON.stringify({ olderThanDays }),
    }),
  clearAuditLogs: () =>
    request<MutateCountResponse>("/api/admin/audit-logs", {
      method: "DELETE",
    }),
};
