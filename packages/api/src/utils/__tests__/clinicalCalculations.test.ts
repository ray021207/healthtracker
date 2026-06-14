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
  it("calculates BMI correctly", () => {
    expect(calculateBMI(80, 180)).toBeCloseTo(24.69, 2);
  });

  it("calculates target weight at BMI 24.9", () => {
    expect(calculateTargetWeight(180)).toBeCloseTo(80.68, 2);
  });

  it("calculates BMR with Mifflin-St Jeor formula", () => {
    expect(calculateBMR(80, 180, 35, "MALE")).toBe(1755);
    expect(calculateBMR(65, 165, 30, "FEMALE")).toBeCloseTo(1370.25, 2);
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
