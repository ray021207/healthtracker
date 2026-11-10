// Shapes returned by the admin progress and food-log endpoints.
export type GlucoseContext = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL" | "BEDTIME" | "OTHER";

export const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  FASTING: "Fasting",
  BEFORE_MEAL: "Before a meal",
  AFTER_MEAL: "After a meal",
  BEDTIME: "Bedtime",
  OTHER: "Other",
};

export type GlucosePoint = { date: string; measuredAt: string; valueMgDl: number; context: GlucoseContext };

export type GlucoseRanges = {
  isDiabetic: boolean;
  note: string;
  ranges: Partial<Record<GlucoseContext, { minMgDl?: number; maxMgDl?: number; text: string }>>;
};

export type Targets = { dailyCalorieTarget: number; dailyProteinG: number; dailyCarbsG: number; dailyFatG: number };

export type NutritionAdherence = {
  windowDays: number;
  daysLogged: number;
  targets: Targets | null;
  daysOnTarget: number;
  onTargetPercent: number | null;
  tolerancePercent: number;
  avgCalories: number;
  avgCaloriePercent: number | null;
  avgProteinPercent: number | null;
  avgCarbsPercent: number | null;
  avgFatPercent: number | null;
  avgPlateCompletion: Array<{ category: string; completionPercent: number }>;
  series: Array<{ date: string; calories: number; carbsG: number; proteinG: number; fatG: number }>;
};

export type AdminFoodEntry = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  source: "MANUAL" | "AI_TEXT" | "AI_PHOTO";
};

export type FoodLogDay = {
  date: string;
  entries: AdminFoodEntry[];
  summary: {
    totals: { calories: number; carbsG: number; proteinG: number; fatG: number };
    percentOfTarget: { calories: number | null } | null;
  };
};

export const PLATE_LABELS: Record<string, string> = {
  NONSTARCHY_VEG: "Non-starchy veg",
  PROTEIN: "Protein",
  CARB: "Carbohydrate",
};

export const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
