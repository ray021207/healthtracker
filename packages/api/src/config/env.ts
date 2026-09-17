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
} as const;
