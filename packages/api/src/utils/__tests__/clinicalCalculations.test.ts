import { describe, expect, it } from "vitest";

import {
  calculateBMI,
  calculateBMR,
  calculateDailyCalorieTarget,
  calculateMacros,
  calculateTDEE,
  calculateTargetWeight,
} from "../clinicalCalculations.js";

describe("clinicalCalculations", () => {
  it("calculates BMI from weight in lb and height in cm", () => {
    // weight is rounded to 1 decimal lb, so allow for that rounding noise.
    expect(calculateBMI(176.4, 180)).toBeCloseTo(24.69, 1);
  });

  it("calculates target weight in lb at BMI 24.9", () => {
    expect(calculateTargetWeight(180)).toBeCloseTo(177.9, 1);
  });

  it("calculates BMR with Mifflin-St Jeor formula", () => {
    expect(calculateBMR(176.4, 180, 35, "MALE")).toBeCloseTo(1755, 0);
    expect(calculateBMR(143.3, 165, 30, "FEMALE")).toBeCloseTo(1370.25, 1);
  });

  it("calculates TDEE by activity multiplier", () => {
    expect(calculateTDEE(1700, "SEDENTARY")).toBe(2040);
    expect(calculateTDEE(1700, "VERY_ACTIVE")).toBeCloseTo(2932.5, 2);
  });

  it("applies calorie deficit with floor logic", () => {
    expect(calculateDailyCalorieTarget(2400, 90, 80)).toBe(1900);
    expect(calculateDailyCalorieTarget(1700, 90, 80)).toBe(1400);
    expect(calculateDailyCalorieTarget(2100, 70, 75)).toBe(2100);
  });

  it("calculates macro targets by diet style", () => {
    expect(calculateMacros(2000, "BALANCED")).toEqual({ proteinG: 125, carbsG: 250, fatG: 56 });
    expect(calculateMacros(1800, "KETO")).toEqual({ proteinG: 113, carbsG: 23, fatG: 140 });
  });
});
