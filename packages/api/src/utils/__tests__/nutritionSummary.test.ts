import { describe, expect, it } from "vitest";

import { summarizeAdherence, summarizeDay, type FoodLike } from "../nutritionSummary.js";

const targets = { dailyCalorieTarget: 2000, dailyProteinG: 100, dailyCarbsG: 200, dailyFatG: 60 };

const food = (over: Partial<FoodLike>): FoodLike => ({
  mealType: "LUNCH",
  calories: 100,
  carbsG: 10,
  proteinG: 5,
  fatG: 2,
  plateCategory: "CARB",
  volumeCups: 1,
  ...over,
});

describe("summarizeDay", () => {
  it("sums totals, per-meal calories and percent of target", () => {
    const s = summarizeDay(
      [
        food({ mealType: "BREAKFAST", calories: 400, carbsG: 50, proteinG: 20, fatG: 10 }),
        food({ mealType: "LUNCH", calories: 600, carbsG: 60, proteinG: 30, fatG: 20 }),
      ],
      targets,
    );
    expect(s.totals).toEqual({ calories: 1000, carbsG: 110, proteinG: 50, fatG: 30 });
    expect(s.byMeal.BREAKFAST).toEqual({ calories: 400, count: 1 });
    expect(s.percentOfTarget).toEqual({ calories: 50, carbs: 55, protein: 50, fat: 50 });
  });

  it("reports plate zones against the 50/25/25 goal, capped at 100%", () => {
    const balanced = summarizeDay(
      [
        food({ plateCategory: "NONSTARCHY_VEG", volumeCups: 2 }),
        food({ plateCategory: "PROTEIN", volumeCups: 1 }),
        food({ plateCategory: "CARB", volumeCups: 1 }),
      ],
      targets,
    );
    expect(balanced.plate.zones.map((z) => z.completionPercent)).toEqual([100, 100, 100]);

    const onlyVeg = summarizeDay([food({ plateCategory: "NONSTARCHY_VEG", volumeCups: 3 })], targets);
    expect(onlyVeg.plate.zones.map((z) => [z.sharePercent, z.completionPercent])).toEqual([
      [100, 100],
      [0, 0],
      [0, 0],
    ]);
  });

  it("keeps fats and drinks out of the plate shares and handles an empty day", () => {
    const s = summarizeDay(
      [food({ plateCategory: "FAT_OTHER", volumeCups: 0.1 }), food({ plateCategory: "DRINK", volumeCups: 1 })],
      targets,
    );
    expect(s.plate.totalVolumeCups).toBe(0);
    expect(summarizeDay([], null).percentOfTarget).toBeNull();
  });
});

describe("summarizeAdherence", () => {
  const day = (date: string, calories: number) => ({
    date,
    summary: summarizeDay([food({ calories })], targets),
  });

  it("counts days within 10% of the calorie target and ignores unlogged days", () => {
    const a = summarizeAdherence([day("d1", 2000), day("d2", 2150), day("d3", 1500), day("d4", 0)], targets);
    expect(a.daysLogged).toBe(3);
    expect(a.daysOnTarget).toBe(2);
    expect(a.onTargetPercent).toBe(67);
    expect(a.avgCalories).toBe(1883);
  });

  it("returns nulls rather than dividing by zero when nothing is logged or no targets exist", () => {
    expect(summarizeAdherence([], targets).onTargetPercent).toBeNull();
    expect(summarizeAdherence([day("d1", 2000)], null).avgCaloriePercent).toBeNull();
  });
});
