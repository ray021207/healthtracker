async function req<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) } });
  const json = await res.json().catch(() => ({}));
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
};
