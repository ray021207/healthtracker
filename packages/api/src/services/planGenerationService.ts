import Anthropic from "@anthropic-ai/sdk";
import {
  PlanStatus,
  Prisma,
  Role,
  type HealthProfile,
  type Patient,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { normalizeWeightToLb } from "../utils/unitNormalization.js";
import { decryptHealthProfileFields } from "../utils/healthProfileCrypto.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const PLAN_MODEL = "claude-sonnet-5";

const mealSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  calories: z.number(),
  proteinG: z.number().optional(),
  carbsG: z.number().optional(),
  fatG: z.number().optional(),
  giIndex: z.number().optional().nullable(),
  ingredients: z.array(z.string()).optional(),
  prepTimeMinutes: z.number().optional().nullable(),
  recipe: z.string().optional().nullable(),
}).passthrough();

const dietDaySchema = z.object({
  totalCalories: z.number(),
  totalProteinG: z.number().optional(),
  totalCarbsG: z.number().optional(),
  totalFatG: z.number().optional(),
  meals: z.object({
    breakfast: mealSchema,
    morningSnack: mealSchema.optional(),
    lunch: mealSchema,
    afternoonSnack: mealSchema.optional(),
    dinner: mealSchema,
  }),
  hydrationLitres: z.number().optional(),
  dailyNote: z.string().optional(),
}).passthrough();

const exerciseDaySchema = z.object({
  phase: z.string(),
  isRestDay: z.boolean(),
  totalDurationMinutes: z.number(),
  totalCaloriesBurned: z.number().optional(),
  warmUp: z.object({ description: z.string(), durationMinutes: z.number() }).optional(),
  exercises: z.array(z.any()).optional(),
  coolDown: z.object({ description: z.string(), durationMinutes: z.number() }).optional(),
  dayNote: z.string().optional(),
}).passthrough();

const phaseSchema = z.object({
  phaseName: z.string(),
  dietWeek: z.array(dietDaySchema).length(7),
  exerciseWeek: z.array(exerciseDaySchema).length(7),
});

const templateResponseSchema = z.object({
  phases: z.array(phaseSchema).length(3),
  ayurvedicRecommendations: z.array(z.any()).nullable().optional(),
});

function calculateAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

// Expand 3 phases × 7-day templates into a flat 90-day array
function expandToNinetyDays(phases: z.infer<typeof phaseSchema>[]) {
  const dietPlan: Prisma.InputJsonValue[] = [];
  const exercisePlan: Prisma.InputJsonValue[] = [];
  const phaseDays = [30, 30, 30];

  for (let p = 0; p < 3; p++) {
    const phase = phases[p]!;
    for (let d = 0; d < phaseDays[p]!; d++) {
      const dayNumber = dietPlan.length + 1;
      const dietTemplate = phase.dietWeek[d % 7] as Prisma.InputJsonObject;
      const exTemplate = phase.exerciseWeek[d % 7] as Prisma.InputJsonObject;
      dietPlan.push({ ...dietTemplate, day: dayNumber });
      exercisePlan.push({ ...exTemplate, day: dayNumber, phase: phase.phaseName });
    }
  }

  return { dietPlan, exercisePlan };
}

export const buildSystemPrompt = () => `
You are a clinical nutrition and exercise specialist working for HECOS (Healing Horizons – Comprehensive Health Care Solutions) clinic.
You generate highly personalised, medically-informed 90-day wellness plans.
You must always:
- Apply the specified diet style strictly
- Respect all allergies and dietary restrictions absolutely
- Follow GI index principles when isDiabetic is true
- Include Ayurvedic and anti-inflammatory suggestions when requested, framed as wellness notes only (never as medical prescriptions)
- Base all calorie and macro values on the provided daily targets (set by the clinic's clinician); each day's totalCalories must land within 5% of the daily calorie target
- Follow the clinician's recommendations when they are provided, unless they conflict with an allergy or dietary restriction, which always wins
- Phase exercise intensity progressively: Month 1 foundation, Month 2 build, Month 3 peak
- Respond ONLY with valid JSON matching the specified schema exactly
- Never include markdown, backticks, or any text outside the JSON
- BE CONCISE: meal names max 5 words, descriptions max 8 words, exercise names max 4 words, notes max 10 words
- Do NOT include recipes, ingredient lists, prepTime, warmUp, coolDown, or modification fields
`;

export const buildUserPrompt = (
  profile: ReturnType<typeof decryptHealthProfileFields<HealthProfile>>,
  patient: Patient,
) => {
  const ageYears = calculateAge(patient.dateOfBirth);
  const weightLb = normalizeWeightToLb(profile.weightKg);
  const targetWeightLb = normalizeWeightToLb(profile.targetWeightKg);
  return `
Generate a 90-day personalised wellness plan as 3 phases, each with a 7-day repeating weekly template.

PATIENT CLINICAL DATA:
- Age: ${ageYears} years
- Gender: ${patient.gender}
- Height: ${profile.heightCm} cm
- Current weight: ${weightLb} lb
- Target weight: ${targetWeightLb ?? "not set"} lb
- BMI: ${profile.bmi.toFixed(1)}
- BMR: ${profile.bmr} kcal/day
- TDEE: ${profile.tdee} kcal/day
- Daily calorie target (clinician-set): ${profile.dailyCalorieTarget} kcal
- Protein target: ${profile.dailyProteinG}g/day
- Carbs target: ${profile.dailyCarbsG}g/day
- Fat target: ${profile.dailyFatG}g/day
- Activity level: ${profile.activityLevel}
- Waist (abdomen) circumference: ${profile.abdomenIn != null ? `${profile.abdomenIn} in` : "not provided"}

HEALTH MARKERS:
- LDL: ${profile.ldlMgDl ?? "not provided"} mg/dL
- HDL: ${profile.hdlMgDl ?? "not provided"} mg/dL
- Triglycerides: ${profile.triglyceridesMgDl ?? "not provided"} mg/dL
- Fasting glucose: ${profile.fastingGlucoseMgDl ?? "not provided"} mg/dL
- HbA1c: ${profile.hba1cPercent ?? "not provided"}%
- Is diabetic: ${profile.isDiabetic}
- Blood pressure: ${profile.systolicBp ?? "not provided"}/${profile.diastolicBp ?? "not provided"} mmHg

DIET PREFERENCES:
- Diet style: ${profile.dietStyle}
- Additional restrictions: ${profile.dietaryRestrictions.join(", ") || "none"}
- Allergies: ${profile.allergies.join(", ") || "none"}
- Medical conditions: ${profile.medicalConditions.join(", ") || "none"}
- Current medications: ${profile.medications.join(", ") || "none"}

CLINICIAN RECOMMENDATIONS (from the care team — follow these):
${profile.clinicianNotes ? profile.clinicianNotes : "none"}

WELLNESS FLAGS:
- Include Ayurvedic suggestions: ${profile.includeAyurvedic}
- Include anti-inflammatory guidance: ${profile.includeAntiInflammatory}
- Apply Glycemic Index principles: ${profile.isDiabetic}

CRITICAL RULES:
${profile.isDiabetic ? "- ALL meals must have giIndex noted. Prioritise low-GI foods (GI < 55). Avoid high-GI foods (GI > 70) entirely." : ""}
${profile.dietStyle === "KETO" ? "- Net carbs must stay under 25g per day total." : ""}
${profile.dietStyle === "VEGAN" || profile.dietStyle === "INDIAN_VEGAN" ? "- Absolutely no animal products including dairy, eggs, or honey." : ""}
${profile.dietStyle === "VEGETARIAN" || profile.dietStyle === "INDIAN_VEGETARIAN" ? "- No meat or seafood. Dairy and eggs are permitted." : ""}
${profile.allergies.length > 0 ? `- These allergens must NEVER appear: ${profile.allergies.join(", ")}` : ""}
${profile.ldlMgDl && profile.ldlMgDl > 130 ? "- LDL is elevated: prioritise low-saturated-fat, high-fibre meals. Avoid fried foods and processed meats." : ""}
${profile.hdlMgDl && profile.hdlMgDl < 40 ? "- HDL is low: include omega-3 rich foods (oily fish, flaxseed, walnuts) to raise HDL." : ""}
${profile.systolicBp && profile.systolicBp > 130 ? "- Blood pressure is elevated: follow DASH principles — low sodium (<1500mg/day), high potassium, avoid processed foods." : ""}

Respond with exactly this JSON structure (3 phases, each with exactly 7 dietWeek days and 7 exerciseWeek days).
KEEP OUTPUT COMPACT — no recipes, no ingredient lists, no warmUp/coolDown objects.
{
  "phases": [
    {
      "phaseName": "foundation",
      "dietWeek": [
        {
          "totalCalories": 1800,
          "totalProteinG": 135,
          "totalCarbsG": 180,
          "totalFatG": 60,
          "meals": {
            "breakfast": { "name": "Oats with banana", "description": "Warm oats, banana", "calories": 400, "giIndex": 45 },
            "morningSnack": { "name": "Apple", "description": "Fresh fruit", "calories": 80, "giIndex": 38 },
            "lunch": { "name": "Chicken salad", "description": "Grilled chicken, greens", "calories": 500, "giIndex": 35 },
            "afternoonSnack": { "name": "Mixed nuts", "description": "Healthy fats", "calories": 150, "giIndex": 15 },
            "dinner": { "name": "Salmon quinoa", "description": "Baked salmon, quinoa", "calories": 620, "giIndex": 40 }
          },
          "hydrationLitres": 2.5,
          "dailyNote": "Eat slowly today."
        }
      ],
      "exerciseWeek": [
        {
          "phase": "foundation",
          "isRestDay": false,
          "totalDurationMinutes": 35,
          "totalCaloriesBurned": 220,
          "exercises": [
            { "name": "Squats", "sets": 3, "reps": 12 },
            { "name": "Push-ups", "sets": 3, "reps": 10 },
            { "name": "Plank", "durationMinutes": 1 }
          ],
          "dayNote": "Focus on form."
        }
      ]
    }
  ],
  "ayurvedicRecommendations": ${profile.includeAyurvedic ? `[
    {
      "name": "Turmeric (Curcumin)",
      "category": "anti-inflammatory",
      "suggestion": "1 tsp in warm milk daily",
      "benefits": "Reduces inflammation, supports joints",
      "disclaimer": "Wellness suggestion only — consult your physician before use."
    }
  ]` : "null"}
}

IMPORTANT: Output all 3 phases (foundation, build, peak) with exactly 7 dietWeek entries and 7 exerciseWeek entries each. Vary meals day to day. Increase exercise intensity across phases. Keep every string SHORT.
`;
};

function repairTruncatedJson(text: string): string {
  let s = text.trim();
  s = s.replace(/"(?:[^"\\]|\\.)*$/, '"..."');
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  s = s.replace(/,\s*$/, "");
  s = s.replace(/:\s*$/, ": null");

  let braces = 0, brackets = 0;
  let inString = false, escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces = Math.max(0, braces - 1);
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets = Math.max(0, brackets - 1);
  }
  while (brackets > 0) { s += "]"; brackets--; }
  while (braces > 0) { s += "}"; braces--; }
  return s;
}

export function parsePlanJsonResponse(rawText: string) {
  const clean = rawText.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const repaired = repairTruncatedJson(clean);
    parsed = JSON.parse(repaired);
  }
  return templateResponseSchema.parse(parsed);
}

export async function generatePatientPlan(patientId: string, generatedBy: string): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { healthProfile: true },
  });

  if (!patient?.healthProfile) {
    throw new Error("This patient's health profile has not been entered yet, so a plan can't be generated.");
  }

  let rawText = "";
  const stream = anthropic.messages.stream({
    model: PLAN_MODEL,
    max_tokens: 16000,
    system: buildSystemPrompt(),
    messages: [
      { role: "user", content: buildUserPrompt(decryptHealthProfileFields(patient.healthProfile), patient) },
    ],
  });
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      rawText += chunk.delta.text;
    }
  }

  const templateData = parsePlanJsonResponse(rawText);
  const { dietPlan, exercisePlan } = expandToNinetyDays(templateData.phases);

  const ayurvedicNotes =
    templateData.ayurvedicRecommendations == null
      ? Prisma.JsonNull
      : templateData.ayurvedicRecommendations;

  await prisma.generatedPlan.upsert({
    where: { patientId },
    create: {
      patientId,
      generatedBy,
      aiModel: PLAN_MODEL,
      startDate: new Date(),
      totalDays: 90,
      dietPlan,
      exercisePlan,
      ayurvedicNotes,
      status: PlanStatus.ACTIVE,
    },
    update: {
      regeneratedAt: new Date(),
      generatedBy,
      aiModel: PLAN_MODEL,
      startDate: new Date(),
      totalDays: 90,
      dietPlan,
      exercisePlan,
      ayurvedicNotes,
      status: PlanStatus.ACTIVE,
    },
  });
}

export async function getAdminPatientPlan(patientId: string, clinicId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    include: { generatedPlan: true },
  });

  if (!patient) return null;
  return patient.generatedPlan;
}

export async function getPatientPlan(patientId: string) {
  return prisma.generatedPlan.findUnique({ where: { patientId } });
}

export async function ensurePatientInClinic(patientId: string, clinicId: string) {
  return prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    select: { id: true },
  });
}

export const defaultActorRole = Role.ADMIN;
