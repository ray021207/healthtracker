import { prisma } from "../lib/prisma.js";
import { normalizeWeightToLb } from "../utils/unitNormalization.js";

interface ProgressStats {
  totalLoggedDays: number;
  adherencePercent: number;
  currentStreakDays: number;
  weightTrend: Array<{ date: string; weightLb: number }>;
}

function calculateCurrentStreak(logDates: Date[]): number {
  if (logDates.length === 0) {
    return 0;
  }

  const normalized = logDates
    .map((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let cursor = normalized[0];

  for (const date of normalized) {
    if (!cursor) {
      break;
    }

    const diffDays = Math.round((cursor.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      continue;
    }

    if (diffDays > 0) {
      break;
    }
  }

  return streak;
}

export async function getPatientProgressStats(patientId: string): Promise<ProgressStats> {
  const logs = await prisma.dailyLog.findMany({
    where: { patientId },
    orderBy: { logDate: "asc" },
    select: {
      logDate: true,
      breakfastDone: true,
      lunchDone: true,
      dinnerDone: true,
      snack1Done: true,
      snack2Done: true,
      exerciseDone: true,
      weightKg: true,
    },
  });

  const totalLoggedDays = logs.length;
  const totalTrackableActions = totalLoggedDays * 6;

  const completedActions = logs.reduce((sum, log) => {
    return (
      sum +
      Number(log.breakfastDone) +
      Number(log.lunchDone) +
      Number(log.dinnerDone) +
      Number(log.snack1Done) +
      Number(log.snack2Done) +
      Number(log.exerciseDone)
    );
  }, 0);

  const adherencePercent =
    totalTrackableActions === 0 ? 0 : Math.round((completedActions / totalTrackableActions) * 100);

  const weightTrend = logs
    .filter((log) => typeof log.weightKg === "number")
    .map((log) => ({
      date: log.logDate.toISOString().slice(0, 10),
      weightLb: normalizeWeightToLb(Number(log.weightKg)),
    }));

  const currentStreakDays = calculateCurrentStreak(logs.map((log) => log.logDate));

  return {
    totalLoggedDays,
    adherencePercent,
    currentStreakDays,
    weightTrend,
  };
}
