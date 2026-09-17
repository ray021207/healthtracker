import "dotenv/config";

const required = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRY",
  "JWT_REFRESH_EXPIRY",
  "CORS_ORIGINS",
  "ENCRYPTION_KEY",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY as string)) {
  throw new Error("ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters)");
}

// Push notifications (daily log reminders) are optional — the API still boots
// without them, but the push routes respond with a clear "not configured"
// error instead of crashing if only some of the three vars are set.
const vapidVars = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY, process.env.VAPID_SUBJECT];
const pushConfigured = vapidVars.every(Boolean);
if (!pushConfigured && vapidVars.some(Boolean)) {
  throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must all be set together, or all left unset");
}

const parseCsv = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3003),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET as string,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY as string,
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY as string,
  corsOrigins: parseCsv(process.env.CORS_ORIGINS as string),
  encryptionKey: process.env.ENCRYPTION_KEY as string,
  isProd: (process.env.NODE_ENV ?? "development") === "production",
  pushEnabled: pushConfigured,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY as string | undefined,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY as string | undefined,
  vapidSubject: process.env.VAPID_SUBJECT as string | undefined,
} as const;
