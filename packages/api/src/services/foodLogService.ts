import type { FoodEntry, GlucoseReading, MealType } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { decrypt, encrypt } from "../utils/encryption.js";
import { summarizeDay, type NutritionTargetsLike } from "../utils/nutritionSummary.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const dateOnly = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
export const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

export async function getNutritionTargets(patientId: string): Promise<NutritionTargetsLike | null> {
  const profile = await prisma.healthProfile.findUnique({
    where: { patientId },
    select: { dailyCalorieTarget: true, dailyProteinG: true, dailyCarbsG: true, dailyFatG: true },
  });
  return profile ?? null;
}

export async function getIsDiabetic(patientId: string): Promise<boolean> {
  const profile = await prisma.healthProfile.findUnique({ where: { patientId }, select: { isDiabetic: true } });
  return profile?.isDiabetic ?? false;
}

export function publicFoodEntry(entry: FoodEntry) {
  const { patientId: _patientId, ...rest } = entry;
  return rest;
}

export async function getDaySummary(patientId: string, logDate: Date) {
  const [entries, targets] = await Promise.all([
    prisma.foodEntry.findMany({ where: { patientId, logDate }, orderBy: { createdAt: "asc" } }),
    getNutritionTargets(patientId),
  ]);
  return { entries: entries.map(publicFoodEntry), summary: summarizeDay(entries, targets) };
}

// Keeps the legacy per-meal "done" flags on DailyLog in step with what was actually logged, so
// reminders, streaks and the adherence numbers keep working without separate checkboxes.
export async function syncMealFlags(patientId: string, logDate: Date): Promise<void> {
  const entries = await prisma.foodEntry.findMany({ where: { patientId, logDate }, select: { mealType: true } });
  const count = (type: MealType) => entries.filter((e) => e.mealType === type).length;
  const flags = {
    breakfastDone: count("BREAKFAST") > 0,
    lunchDone: count("LUNCH") > 0,
    dinnerDone: count("DINNER") > 0,
    snack1Done: count("SNACK") > 0,
    snack2Done: count("SNACK") > 1,
  };

  const plan = await prisma.generatedPlan.findUnique({ where: { patientId }, select: { startDate: true } });
  const startDay = plan ? Date.UTC(plan.startDate.getUTCFullYear(), plan.startDate.getUTCMonth(), plan.startDate.getUTCDate()) : null;
  const dayNumber =
    startDay === null ? 1 : Math.min(90, Math.max(1, Math.floor((logDate.getTime() - startDay) / DAY_MS) + 1));

  await prisma.dailyLog.upsert({
    where: { patientId_logDate: { patientId, logDate } },
    create: { patientId, logDate, dayNumber, syncedAt: new Date(), ...flags },
    update: { ...flags },
  });
}

export function publicGlucoseReading(reading: GlucoseReading) {
  return {
    id: reading.id,
    logDate: toIsoDate(reading.logDate),
    measuredAt: reading.measuredAt,
    valueMgDl: Number(decrypt(reading.valueMgDl)),
    context: reading.context,
  };
}

export const encryptGlucoseValue = (value: number) => encrypt(String(value));
