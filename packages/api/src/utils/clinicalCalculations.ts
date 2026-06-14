import type { ActivityLevel, DietStyle } from "@prisma/client";

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function calculateTargetWeight(heightCm: number): number {
  const heightM = heightCm / 100;
  return 24.9 * (heightM * heightM);
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: "MALE" | "FEMALE",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return gender === "MALE" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    MODERATELY_ACTIVE: 1.55,
    VERY_ACTIVE: 1.725,
    EXTRA_ACTIVE: 1.9,
  };

  return bmr * multipliers[activityLevel];
}

export function calculateDailyCalorieTarget(
  tdee: number,
  currentWeight: number,
  targetWeight: number,
): number {
  if (currentWeight <= targetWeight) {
    return Math.round(tdee);
  }

  return Math.max(Math.round(tdee - 500), 1400);
}

export function calculateMacros(
  calories: number,
  dietStyle: DietStyle,
): { proteinG: number; carbsG: number; fatG: number } {
  const ratios: Record<DietStyle, [number, number, number]> = {
    KETO: [0.25, 0.05, 0.7],
    LOW_CARB: [0.3, 0.2, 0.5],
    MEDITERRANEAN: [0.2, 0.5, 0.3],
    LOW_CHOLESTEROL: [0.25, 0.55, 0.2],
    VEGETARIAN: [0.2, 0.55, 0.25],
    NON_VEGETARIAN: [0.3, 0.45, 0.25],
    VEGAN: [0.2, 0.6, 0.2],
    INDIAN: [0.2, 0.55, 0.25],
    INDIAN_VEGETARIAN: [0.2, 0.55, 0.25],
    INDIAN_VEGAN: [0.2, 0.58, 0.22],
    DIABETIC_FRIENDLY: [0.25, 0.4, 0.35],
    BALANCED: [0.25, 0.5, 0.25],
  };

  const [p, c, f] = ratios[dietStyle];

  return {
    proteinG: Math.round((calories * p) / 4),
    carbsG: Math.round((calories * c) / 4),
    fatG: Math.round((calories * f) / 9),
  };
}
