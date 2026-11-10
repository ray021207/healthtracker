export type MealTypeKey = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type PlateCategoryKey = "NONSTARCHY_VEG" | "PROTEIN" | "CARB" | "FAT_OTHER" | "DRINK";

export interface FoodLike {
  mealType: MealTypeKey;
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  plateCategory: PlateCategoryKey;
  volumeCups: number;
}

export interface NutritionTargetsLike {
  dailyCalorieTarget: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
}

// Plate method: half non-starchy vegetables, a quarter protein, a quarter carbohydrate.
// Fats and drinks sit outside the plate, so they are not part of the plate shares.
export const PLATE_ZONES = [
  { category: "NONSTARCHY_VEG", goalShare: 0.5 },
  { category: "PROTEIN", goalShare: 0.25 },
  { category: "CARB", goalShare: 0.25 },
] as const;

// A day counts as "on target" when logged calories are within this fraction of the target.
export const CALORIE_ON_TARGET_TOLERANCE = 0.1;

const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const percentOf = (value: number, target: number): number | null =>
  target > 0 ? Math.round((value / target) * 100) : null;

export function summarizeDay(entries: FoodLike[], targets: NutritionTargetsLike | null) {
  const totals = { calories: 0, carbsG: 0, proteinG: 0, fatG: 0 };
  const byMeal: Record<MealTypeKey, { calories: number; count: number }> = {
    BREAKFAST: { calories: 0, count: 0 },
    LUNCH: { calories: 0, count: 0 },
    DINNER: { calories: 0, count: 0 },
    SNACK: { calories: 0, count: 0 },
  };
  const volume: Record<string, number> = {};

  for (const e of entries) {
    totals.calories += e.calories;
    totals.carbsG += e.carbsG;
    totals.proteinG += e.proteinG;
    totals.fatG += e.fatG;
    byMeal[e.mealType].calories += e.calories;
    byMeal[e.mealType].count += 1;
    volume[e.plateCategory] = (volume[e.plateCategory] ?? 0) + e.volumeCups;
  }

  const plateVolume = PLATE_ZONES.reduce((sum, z) => sum + (volume[z.category] ?? 0), 0);
  const zones = PLATE_ZONES.map((z) => {
    const cups = volume[z.category] ?? 0;
    const share = plateVolume > 0 ? cups / plateVolume : 0;
    return {
      category: z.category,
      volumeCups: round(cups, 2),
      sharePercent: Math.round(share * 100),
      goalSharePercent: Math.round(z.goalShare * 100),
      // How much of this zone's goal share has been reached, capped at 100.
      completionPercent: Math.min(100, Math.round((share / z.goalShare) * 100)),
    };
  });

  return {
    totals: {
      calories: Math.round(totals.calories),
      carbsG: round(totals.carbsG, 1),
      proteinG: round(totals.proteinG, 1),
      fatG: round(totals.fatG, 1),
    },
    byMeal,
    targets,
    percentOfTarget: targets
      ? {
          calories: percentOf(totals.calories, targets.dailyCalorieTarget),
          carbs: percentOf(totals.carbsG, targets.dailyCarbsG),
          protein: percentOf(totals.proteinG, targets.dailyProteinG),
          fat: percentOf(totals.fatG, targets.dailyFatG),
        }
      : null,
    plate: { totalVolumeCups: round(plateVolume, 2), zones },
  };
}

export type DaySummary = ReturnType<typeof summarizeDay>;

// Adherence is measured against the clinician-set targets, over days where something was logged.
export function summarizeAdherence(
  days: Array<{ date: string; summary: DaySummary }>,
  targets: NutritionTargetsLike | null,
) {
  const logged = days.filter((d) => d.summary.totals.calories > 0);
  const n = logged.length;
  const avg = (pick: (d: DaySummary) => number) =>
    n === 0 ? 0 : logged.reduce((sum, d) => sum + pick(d.summary), 0) / n;

  const daysOnTarget = targets
    ? logged.filter(
        (d) =>
          Math.abs(d.summary.totals.calories - targets.dailyCalorieTarget) <=
          targets.dailyCalorieTarget * CALORIE_ON_TARGET_TOLERANCE,
      ).length
    : 0;

  const avgCalories = avg((s) => s.totals.calories);
  const avgProtein = avg((s) => s.totals.proteinG);
  const avgCarbs = avg((s) => s.totals.carbsG);
  const avgFat = avg((s) => s.totals.fatG);

  return {
    daysLogged: n,
    targets,
    daysOnTarget,
    onTargetPercent: n === 0 || !targets ? null : Math.round((daysOnTarget / n) * 100),
    tolerancePercent: Math.round(CALORIE_ON_TARGET_TOLERANCE * 100),
    avgCalories: Math.round(avgCalories),
    avgCaloriePercent: targets ? percentOf(avgCalories, targets.dailyCalorieTarget) : null,
    avgProteinPercent: targets ? percentOf(avgProtein, targets.dailyProteinG) : null,
    avgCarbsPercent: targets ? percentOf(avgCarbs, targets.dailyCarbsG) : null,
    avgFatPercent: targets ? percentOf(avgFat, targets.dailyFatG) : null,
    avgPlateCompletion: PLATE_ZONES.map((z, i) => ({
      category: z.category,
      completionPercent: n === 0 ? 0 : Math.round(avg((s) => s.plate.zones[i]!.completionPercent)),
    })),
    series: days.map((d) => ({
      date: d.date,
      calories: d.summary.totals.calories,
      carbsG: d.summary.totals.carbsG,
      proteinG: d.summary.totals.proteinG,
      fatG: d.summary.totals.fatG,
    })),
  };
}
