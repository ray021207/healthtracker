export type Role = "ADMIN" | "PATIENT";

export type Gender = "MALE" | "FEMALE" | "OTHER";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE"
  | "EXTRA_ACTIVE";

export type DietStyle =
  | "MEDITERRANEAN"
  | "KETO"
  | "LOW_CARB"
  | "LOW_CHOLESTEROL"
  | "VEGETARIAN"
  | "NON_VEGETARIAN"
  | "VEGAN"
  | "INDIAN"
  | "INDIAN_VEGETARIAN"
  | "INDIAN_VEGAN"
  | "DIABETIC_FRIENDLY"
  | "BALANCED";

export type PlanStatus = "ACTIVE" | "SUPERSEDED" | "ARCHIVED";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "VIEW_PATIENT"
  | "CREATE_PATIENT"
  | "UPDATE_PATIENT"
  | "VIEW_HEALTH_PROFILE"
  | "UPDATE_HEALTH_PROFILE"
  | "GENERATE_PLAN"
  | "VIEW_PLAN"
  | "EXPORT_PDF"
  | "UPDATE_DAILY_LOG"
  | "REVOKE_ACCESS";

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface HealthProfileInput {
  heightCm: number;
  weightKg: number;
  ldlMgDl?: number;
  hdlMgDl?: number;
  triglyceridesMgDl?: number;
  fastingGlucoseMgDl?: number;
  hba1cPercent?: number;
  isDiabetic?: boolean;
  systolicBp?: number;
  diastolicBp?: number;
  activityLevel: ActivityLevel;
  dietStyle: DietStyle;
  dietaryRestrictions: string[];
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  includeAyurvedic?: boolean;
  includeAntiInflammatory?: boolean;
}

export interface DailyLogInput {
  logDate: string;
  dayNumber: number;
  breakfastDone?: boolean;
  lunchDone?: boolean;
  dinnerDone?: boolean;
  snack1Done?: boolean;
  snack2Done?: boolean;
  waterLitres?: number;
  mealNotes?: string;
  exerciseDone?: boolean;
  exerciseDuration?: number;
  exerciseNotes?: string;
  weightKg?: number;
  energyLevel?: number;
  mood?: number;
}
