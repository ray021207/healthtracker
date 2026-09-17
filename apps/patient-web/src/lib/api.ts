const STORAGE_KEY = "monark_patient_auth";

type StoredAuth = {
  user?: unknown;
  accessToken?: string;
  refreshToken?: string | null;
};

function readStoredAuth(): StoredAuth | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function writeStoredAuth(next: StoredAuth): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // no-op: failing storage should not crash API calls
  }
}

async function refreshPatientAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-client-type": "mobile" },
    body: JSON.stringify({ refreshToken }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };

  if (!res.ok || !json.accessToken) {
    return null;
  }

  const stored = readStoredAuth();
  writeStoredAuth({
    user: json.user ?? stored?.user,
    accessToken: json.accessToken,
    refreshToken: json.refreshToken ?? stored?.refreshToken ?? null,
  });

  return json.accessToken;
}

async function req<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const buildHeaders = (authToken?: string): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return { ...headers, ...((options.headers as Record<string, string>) ?? {}) };
  };

  let activeToken = token;
  let res = await fetch(path, { ...options, headers: buildHeaders(activeToken) });
  let json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const stored = readStoredAuth();
    if (stored?.refreshToken) {
      const refreshed = await refreshPatientAccessToken(stored.refreshToken);
      if (refreshed) {
        activeToken = refreshed;
        res = await fetch(path, { ...options, headers: buildHeaders(activeToken) });
        json = await res.json().catch(() => ({}));
      }
    }
  }

  if (!res.ok) throw new Error((json as { message?: string }).message || `Request failed (${res.status})`);
  return json as T;
}

export type DietDay = {
  day: number;
  totalCalories?: number;
  totalProteinG?: number;
  totalCarbsG?: number;
  totalFatG?: number;
  hydrationLitres?: number;
  dailyNote?: string;
  meals?: {
    breakfast?: Meal;
    morningSnack?: Meal;
    lunch?: Meal;
    afternoonSnack?: Meal;
    dinner?: Meal;
  };
};

export type Meal = {
  name?: string;
  description?: string;
  calories?: number;
  giIndex?: number;
  ingredients?: string[];
  recipe?: string;
};

export type ExerciseDay = {
  day: number;
  phase?: string;
  isRestDay?: boolean;
  totalDurationMinutes?: number;
  totalCaloriesBurned?: number;
  dayNote?: string;
  exercises?: { name?: string; type?: string; sets?: number; reps?: number; durationMinutes?: number }[];
};

export type AyurvedicRec = {
  name?: string;
  category?: string;
  suggestion?: string;
  benefits?: string;
  disclaimer?: string;
};

export const api = {
  getTodayPlan: (token: string) =>
    req<{ dayNumber: number; dietDay: DietDay | null; exerciseDay: ExerciseDay | null }>("/api/patient/plan/today", {}, token).catch(() => null),

  getPlan: (token: string) =>
    req<{ plan: Record<string, unknown> }>("/api/patient/plan", {}, token).catch(() => null),

  getProgress: (token: string) =>
    req<{ progress: { totalLoggedDays: number; adherencePercent: number; currentStreakDays: number } }>("/api/patient/progress", {}, token).catch(() => null),

  getDailyLog: (date: string, token: string) =>
    req<{ log: Record<string, unknown> | null }>(`/api/patient/logs/${date}`, {}, token).catch(() => null),

  submitDailyLog: (data: Record<string, unknown>, token: string) =>
    req<{ log: Record<string, unknown> }>("/api/patient/logs", { method: "POST", body: JSON.stringify(data) }, token),

  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    req<{ message: string }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }, token),

  generatePlan: (token: string) =>
    req<{ message: string }>("/api/patient/generate-plan", { method: "POST" }, token),

  getHealthProfile: (token: string) =>
    req<{ healthProfile: Record<string, unknown> | null }>("/api/patient/health-profile", {}, token).catch(() => null),

  updateHealthProfile: (data: Record<string, unknown>, token: string) =>
    req<{ healthProfile: Record<string, unknown> }>("/api/patient/health-profile", { method: "PUT", body: JSON.stringify(data) }, token),

  getProfile: (token: string) =>
    req<{ profile: Record<string, unknown> }>("/api/patient/profile", {}, token).catch(() => null),

  getPushPublicKey: (token: string) =>
    req<{ publicKey: string }>("/api/patient/push/public-key", {}, token),

  subscribePush: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    reminderTime: string,
    timezone: string,
    token: string,
  ) =>
    req<{ message: string }>(
      "/api/patient/push/subscribe",
      { method: "POST", body: JSON.stringify({ subscription, reminderTime, timezone }) },
      token,
    ),

  unsubscribePush: (endpoint: string | undefined, token: string) =>
    req<{ message: string }>(
      "/api/patient/push/unsubscribe",
      { method: "POST", body: JSON.stringify({ endpoint }) },
      token,
    ),
};
