import type { FoodItemDraft, GlucoseContext, MealType, PlateCategory } from "./api";

// Household measures a patient can pick. `cups` is the approximate volume of one unit, used to
// place manually entered food on the plate. Hand guides follow the usual palm / fist / thumb rule.
export const FOOD_UNITS = [
  { value: "cup", label: "cup", cups: 1 },
  { value: "bowl", label: "bowl", cups: 1.5 },
  { value: "tbsp", label: "tablespoon", cups: 0.0625 },
  { value: "tsp", label: "teaspoon", cups: 0.0208 },
  { value: "oz", label: "ounce", cups: 0.125 },
  { value: "g", label: "gram", cups: 0.004 },
  { value: "piece", label: "piece", cups: 0.5 },
  { value: "slice", label: "slice", cups: 0.25 },
  { value: "serving", label: "serving", cups: 1 },
  { value: "palm", label: "palm (≈3 oz meat)", cups: 0.75 },
  { value: "fist", label: "fist (≈1 cup)", cups: 1 },
  { value: "thumb", label: "thumb (≈1 tbsp)", cups: 0.0625 },
] as const;

export const unitCups = (unit: string) => FOOD_UNITS.find((u) => u.value === unit)?.cups ?? 0.5;

export const MEAL_TYPES: Array<{ value: MealType; label: string }> = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snacks" },
];

export const PLATE_CATEGORIES: Array<{ value: PlateCategory; label: string }> = [
  { value: "NONSTARCHY_VEG", label: "Non-starchy vegetable" },
  { value: "PROTEIN", label: "Protein" },
  { value: "CARB", label: "Carbohydrate" },
  { value: "FAT_OTHER", label: "Fat / sauce" },
  { value: "DRINK", label: "Drink" },
];

export const PLATE_COLORS = {
  NONSTARCHY_VEG: "#4CAF82",
  PROTEIN: "#E8A838",
  CARB: "#7A72B3",
  WATER: "#5B9BD5",
} as const;

export const GLUCOSE_CONTEXTS: Array<{ value: GlucoseContext; label: string }> = [
  { value: "FASTING", label: "Fasting" },
  { value: "BEFORE_MEAL", label: "Before a meal" },
  { value: "AFTER_MEAL", label: "After a meal" },
  { value: "BEDTIME", label: "Bedtime" },
  { value: "OTHER", label: "Other" },
];

export const emptyItem = (): FoodItemDraft => ({
  name: "",
  quantity: 1,
  unit: "serving",
  calories: 0,
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
  plateCategory: "CARB",
  volumeCups: 0,
  source: "MANUAL",
});

// Quantity edits scale everything proportionally, so "1 bowl" -> "2 bowls" doubles the numbers.
export function scaleItem(item: FoodItemDraft, quantity: number): FoodItemDraft {
  if (!(item.quantity > 0) || !(quantity > 0)) return { ...item, quantity };
  const r = quantity / item.quantity;
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    ...item,
    quantity,
    calories: Math.round(item.calories * r),
    carbsG: round(item.carbsG * r),
    proteinG: round(item.proteinG * r),
    fatG: round(item.fatG * r),
    volumeCups: Math.round(item.volumeCups * r * 100) / 100,
  };
}

// Downsizes a photo before upload. Redrawing on a canvas also drops EXIF (location, device) data.
export async function photoToBase64(file: File, maxSide = 1024): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { base64: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" };
}
