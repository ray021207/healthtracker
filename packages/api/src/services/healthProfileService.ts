import type { ActivityLevel, DietStyle, Gender, HealthProfile, Prisma } from "@prisma/client";

import {
  calculateBMI,
  calculateBMR,
  calculateDailyCalorieTarget,
  calculateMacros,
  calculateTDEE,
  calculateTargetWeight,
} from "../utils/clinicalCalculations.js";
import { encryptHealthProfileFields, type HealthProfilePlainInput } from "../utils/healthProfileCrypto.js";

export interface NutritionTargets {
  dailyCalorieTarget: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
}

export interface HealthProfileInput extends HealthProfilePlainInput {
  heightCm: number;
  weightKg: number; // stored in lb despite the column name — see unitNormalization.ts
  isDiabetic: boolean;
  activityLevel: ActivityLevel;
  dietStyle: DietStyle;
  dietaryRestrictions: string[];
  includeAyurvedic: boolean;
  includeAntiInflammatory: boolean;
}

// undefined = keep whatever is stored, null = go back to the automatic values, object = clinician override.
export type TargetsChange = NutritionTargets | null | undefined;

export function calculateAge(dateOfBirth: Date, now = new Date()): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

export function calculateAutoTargets(
  input: Pick<HealthProfileInput, "heightCm" | "weightKg" | "activityLevel" | "dietStyle">,
  patient: { dateOfBirth: Date; gender: Gender },
) {
  if (patient.gender === "OTHER") throw new Error("BMR calculation requires MALE or FEMALE gender");
  const ageYears = calculateAge(patient.dateOfBirth);
  const bmi = calculateBMI(input.weightKg, input.heightCm);
  const targetWeightKg = calculateTargetWeight(input.heightCm);
  const bmr = calculateBMR(input.weightKg, input.heightCm, ageYears, patient.gender);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const dailyCalorieTarget = calculateDailyCalorieTarget(tdee, input.weightKg, targetWeightKg);
  const macros = calculateMacros(dailyCalorieTarget, input.dietStyle);
  const targets: NutritionTargets = {
    dailyCalorieTarget,
    dailyProteinG: macros.proteinG,
    dailyCarbsG: macros.carbsG,
    dailyFatG: macros.fatG,
  };
  return { bmi, targetWeightKg, bmr, tdee, targets };
}

// Single place that turns a validated profile payload into the Prisma write, shared by the
// admin and patient routes so a patient self-edit can never wipe clinician-owned fields
// (abdomen, recommendations, overridden targets).
export function buildHealthProfileData(params: {
  input: HealthProfileInput;
  patient: { dateOfBirth: Date; gender: Gender };
  existing: HealthProfile | null;
  targetsChange?: TargetsChange;
}): Omit<Prisma.HealthProfileUncheckedCreateInput, "patientId"> {
  const { input, patient, existing, targetsChange } = params;
  const auto = calculateAutoTargets(input, patient);

  let targets = auto.targets;
  let targetsOverridden = false;
  if (targetsChange) {
    targets = targetsChange;
    targetsOverridden = true;
  } else if (targetsChange === undefined && existing?.targetsOverridden) {
    targets = {
      dailyCalorieTarget: existing.dailyCalorieTarget,
      dailyProteinG: existing.dailyProteinG,
      dailyCarbsG: existing.dailyCarbsG,
      dailyFatG: existing.dailyFatG,
    };
    targetsOverridden = true;
  }

  return {
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    targetWeightKg: auto.targetWeightKg,
    bmi: auto.bmi,
    ...encryptHealthProfileFields(input, existing ?? undefined),
    isDiabetic: input.isDiabetic,
    activityLevel: input.activityLevel,
    dietStyle: input.dietStyle,
    dietaryRestrictions: input.dietaryRestrictions,
    includeAyurvedic: input.includeAyurvedic,
    includeAntiInflammatory: input.includeAntiInflammatory,
    bmr: auto.bmr,
    tdee: auto.tdee,
    targetsOverridden,
    ...targets,
  };
}
