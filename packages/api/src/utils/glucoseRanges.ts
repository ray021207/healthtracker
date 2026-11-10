export type GlucoseContextKey = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL" | "BEDTIME" | "OTHER";

export interface GlucoseRange {
  minMgDl?: number;
  maxMgDl?: number;
  text: string;
}

// Informational reference ranges shown next to a reading. They are NOT warnings and nothing in
// the app alerts on them. Values follow the general American Diabetes Association targets for
// adults; the clinic's clinicians should confirm or replace them before go-live.
const WITH_DIABETES: Partial<Record<GlucoseContextKey, GlucoseRange>> = {
  FASTING: { minMgDl: 80, maxMgDl: 130, text: "80–130 mg/dL" },
  BEFORE_MEAL: { minMgDl: 80, maxMgDl: 130, text: "80–130 mg/dL" },
  AFTER_MEAL: { maxMgDl: 180, text: "under 180 mg/dL, 1–2 hours after you start eating" },
};

const WITHOUT_DIABETES: Partial<Record<GlucoseContextKey, GlucoseRange>> = {
  FASTING: { minMgDl: 70, maxMgDl: 99, text: "70–99 mg/dL" },
  BEFORE_MEAL: { minMgDl: 70, maxMgDl: 99, text: "70–99 mg/dL" },
  AFTER_MEAL: { maxMgDl: 140, text: "under 140 mg/dL, 2 hours after you start eating" },
};

export function glucoseRangeFor(isDiabetic: boolean, context: GlucoseContextKey): GlucoseRange | null {
  return (isDiabetic ? WITH_DIABETES : WITHOUT_DIABETES)[context] ?? null;
}

// All ranges for one patient, keyed by context, for the clients to display.
export function glucoseRangesFor(isDiabetic: boolean) {
  return {
    isDiabetic,
    note: "General reference ranges for information only. Your care team may set different goals for you.",
    ranges: { ...(isDiabetic ? WITH_DIABETES : WITHOUT_DIABETES) },
  };
}
