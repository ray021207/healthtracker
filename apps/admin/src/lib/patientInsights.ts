// Shared logic for deriving plan/engagement signals from the patient list
// response, used by both the Dashboard tiles and the Patients list filters
// so the two stay in agreement about what "disengaged" means.
export const DISENGAGED_DAYS = 5;

type GeneratedPlan = { generatedAt?: string; regeneratedAt?: string | null } | null | undefined;
type DailyLogEntry = { logDate?: string };

export function getPlanDate(patient: Record<string, unknown>): Date | null {
  const gp = patient.generatedPlan as GeneratedPlan;
  if (!gp) return null;
  return new Date(gp.regeneratedAt ?? gp.generatedAt ?? "");
}

export function getLastLogDate(patient: Record<string, unknown>): Date | null {
  const logs = patient.dailyLogs as DailyLogEntry[] | undefined;
  const d = logs?.[0]?.logDate;
  return d ? new Date(d) : null;
}

export function daysSince(date: Date | null): number {
  return date ? (Date.now() - date.getTime()) / 86_400_000 : Infinity;
}

export function isDisengaged(patient: Record<string, unknown>): boolean {
  if (!patient.generatedPlan) return false;
  // Grace period — don't flag a patient before they've had a fair chance to log anything.
  if (daysSince(getPlanDate(patient)) < DISENGAGED_DAYS) return false;
  return daysSince(getLastLogDate(patient)) >= DISENGAGED_DAYS;
}
