import { kgToLb } from "./units.js";

// Historical entries may be kg; values below 90 are treated as kg and converted.
export function normalizeWeightToLb(weightValue: number): number {
  return weightValue < 90 ? Number(kgToLb(weightValue).toFixed(1)) : weightValue;
}
