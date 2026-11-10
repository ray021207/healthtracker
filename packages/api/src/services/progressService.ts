import { prisma } from "../lib/prisma.js";
import { decrypt } from "../utils/encryption.js";
import { glucoseRangesFor } from "../utils/glucoseRanges.js";
import { summarizeAdherence, summarizeDay } from "../utils/nutritionSummary.js";
import { normalizeWeightToLb } from "../utils/unitNormalization.js";
import { getIsDiabetic, getNutritionTargets, toIsoDate } from "./foodLogService.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NUTRITION_WINDOW_DAYS = 30;
const GLUCOSE_WINDOW_DAYS = 90;

interface ProgressStats {
  totalLoggedDays: number;
  adherencePercent: number;
  currentStreakDays: number;
  weightTrend: Array<{ date: string; weightLb: number }>;
  glucoseTrend: Array<{ date: string; measuredAt: Date; valueMgDl: number; context: string }>;
  glucoseRanges: ReturnType<typeof glucoseRangesFor>;
  nutrition: ReturnType<typeof summarizeAdherence> & { windowDays: number };
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

  const since = new Date(Date.now() - NUTRITION_WINDOW_DAYS * DAY_MS);
  const [foodEntries, glucoseRows, targets, isDiabetic] = await Promise.all([
    prisma.foodEntry.findMany({ where: { patientId, logDate: { gte: since } }, orderBy: { logDate: "asc" } }),
    prisma.glucoseReading.findMany({
      where: { patientId, measuredAt: { gte: new Date(Date.now() - GLUCOSE_WINDOW_DAYS * DAY_MS) } },
      orderBy: { measuredAt: "asc" },
    }),
    getNutritionTargets(patientId),
    getIsDiabetic(patientId),
  ]);

  const byDate = new Map<string, typeof foodEntries>();
  for (const entry of foodEntries) {
    const key = toIsoDate(entry.logDate);
    byDate.set(key, [...(byDate.get(key) ?? []), entry]);
  }
  const nutrition = {
    ...summarizeAdherence(
      [...byDate.entries()].map(([date, entries]) => ({ date, summary: summarizeDay(entries, targets) })),
      targets,
    ),
    windowDays: NUTRITION_WINDOW_DAYS,
  };

  const glucoseTrend = glucoseRows.map((row) => ({
    date: toIsoDate(row.logDate),
    measuredAt: row.measuredAt,
    valueMgDl: Number(decrypt(row.valueMgDl)),
    context: row.context,
  }));

  return {
    totalLoggedDays,
    adherencePercent,
    currentStreakDays,
    weightTrend,
    glucoseTrend,
    glucoseRanges: glucoseRangesFor(isDiabetic),
    nutrition,
  };
}
