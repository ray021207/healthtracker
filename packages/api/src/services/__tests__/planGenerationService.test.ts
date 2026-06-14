import { describe, expect, it } from "vitest";

import {
  buildSystemPrompt,
  buildUserPrompt,
  parsePlanJsonResponse,
} from "../planGenerationService.js";

const mockPatient = {
  id: "patient-1",
  clinicId: "clinic-1",
  email: "p1@example.com",
  passwordHash: "hash",
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
  gender: "FEMALE",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

const mockProfile = {
  id: "hp-1",
  patientId: "patient-1",
  heightCm: 165,
  weightKg: 72,
  targetWeightKg: 67,
  bmi: 26.4,
  ldlMgDl: 130,
  hdlMgDl: 48,
  triglyceridesMgDl: 150,
  fastingGlucoseMgDl: 110,
  hba1cPercent: 6.2,
  isDiabetic: true,
  systolicBp: 130,
  diastolicBp: 85,
  activityLevel: "MODERATELY_ACTIVE",
  dietStyle: "KETO",
  dietaryRestrictions: ["No shellfish"],
  allergies: ["Peanut"],
  medicalConditions: ["Prediabetes"],
  medications: ["Metformin"],
  includeAyurvedic: true,
  includeAntiInflammatory: true,
  bmr: 1450,
  tdee: 2248,
  dailyCalorieTarget: 1748,
  dailyProteinG: 109,
  dailyCarbsG: 22,
  dailyFatG: 136,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

const minimalDietDay = {
  totalCalories: 1800,
  totalProteinG: 100,
  totalCarbsG: 150,
  totalFatG: 70,
  meals: {
    breakfast: { name: "Oats", calories: 400 },
    lunch: { name: "Salad", calories: 500 },
    dinner: { name: "Fish", calories: 600 },
  },
  hydrationLitres: 2.5,
  dailyNote: "note",
};

const minimalExerciseDay = {
  phase: "foundation",
  isRestDay: false,
  totalDurationMinutes: 30,
  exercises: [],
};

function makeWeek<T>(template: T): T[] {
  return Array.from({ length: 7 }, () => ({ ...template as object })) as T[];
}

const validTemplateJson = JSON.stringify({
  phases: [
    { phaseName: "foundation", dietWeek: makeWeek(minimalDietDay), exerciseWeek: makeWeek(minimalExerciseDay) },
    { phaseName: "build", dietWeek: makeWeek(minimalDietDay), exerciseWeek: makeWeek(minimalExerciseDay) },
    { phaseName: "peak", dietWeek: makeWeek(minimalDietDay), exerciseWeek: makeWeek(minimalExerciseDay) },
  ],
  ayurvedicRecommendations: null,
});

describe("planGenerationService", () => {
  it("builds strict system prompt", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Respond ONLY with valid JSON");
    expect(prompt).toContain("Never include markdown");
  });

  it("injects diabetic, keto and allergy rules", () => {
    const prompt = buildUserPrompt(mockProfile as never, mockPatient as never);
    expect(prompt).toContain("ALL meals must have giIndex noted");
    expect(prompt).toContain("Net carbs must stay under 25g per day total");
    expect(prompt).toContain("These allergens must NEVER appear: Peanut");
  });

  it("parses valid template JSON", () => {
    const parsed = parsePlanJsonResponse(validTemplateJson);
    expect(parsed.phases).toHaveLength(3);
    expect(parsed.phases[0]?.dietWeek).toHaveLength(7);
    expect(parsed.phases[0]?.exerciseWeek).toHaveLength(7);
  });

  it("rejects malformed plan JSON", () => {
    expect(() => parsePlanJsonResponse('{"phases":[]}')).toThrow();
  });
});
