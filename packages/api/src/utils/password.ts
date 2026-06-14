import { randomBytes } from "node:crypto";

export function generateTemporaryPassword(length = 16): string {
  const raw = randomBytes(length).toString("base64url");
  return `${raw.slice(0, Math.max(length - 1, 12))}A1!`;
}
