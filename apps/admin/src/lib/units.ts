const LB_PER_KG = 2.2046226218;
const IN_PER_CM = 0.3937007874;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToIn(cm: number): number {
  return cm * IN_PER_CM;
}

export function inToCm(inches: number): number {
  return inches / IN_PER_CM;
}

export function toFixedNumber(value: number, digits = 1): number {
  return Number(value.toFixed(digits));
}

export function formatFeetInchesFromCm(cm?: number): string {
  if (!cm || !Number.isFinite(cm)) {
    return "-";
  }

  const totalInches = Math.round(cmToIn(cm));
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}' ${inches}\"`;
}
