export function expiryToDate(expiryValue: string): Date {
  const now = Date.now();
  const parsed = /^(\d+)([smhd])$/.exec(expiryValue.trim());

  if (!parsed) {
    throw new Error(`Unsupported expiry format: ${expiryValue}`);
  }

  const amountRaw = parsed[1];
  const unitRaw = parsed[2];

  if (!amountRaw || !unitRaw) {
    throw new Error(`Unsupported expiry format: ${expiryValue}`);
  }

  const amount = Number(amountRaw);
  const unit = unitRaw as "s" | "m" | "h" | "d";

  const multipliers: Record<"s" | "m" | "h" | "d", number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(now + amount * multipliers[unit]);
}
