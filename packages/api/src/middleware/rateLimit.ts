import rateLimit from "express-rate-limit";

import { env } from "../config/env.js";

// Window and max are overridable via env; defaults are lenient in development
// (so local testing doesn't lock you out) and strict in production.
const rawWindowMinutes = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MIN ?? 15);
const rawMaxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX ?? (env.isProd ? 20 : 100));
const windowMinutes = Number.isFinite(rawWindowMinutes) ? rawWindowMinutes : 15;
const maxAttempts = Number.isFinite(rawMaxAttempts) ? rawMaxAttempts : (env.isProd ? 20 : 100);

export const authRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxAttempts,
  // Only failed auth attempts count toward the limit, so successful logins and
  // routine token refreshes never trip it.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

// Plan generation calls the LLM (real cost per request) and is a deliberate,
// infrequent action — legitimate use never needs more than a handful per hour.
// Keyed per-user (not IP) since this only ever runs behind `authenticate`.
const planGenWindowMinutes = Number(process.env.PLAN_GEN_RATE_LIMIT_WINDOW_MIN ?? 60);
const planGenMax = Number(process.env.PLAN_GEN_RATE_LIMIT_MAX ?? (env.isProd ? 5 : 50));

export const planGenerationRateLimiter = rateLimit({
  windowMs: (Number.isFinite(planGenWindowMinutes) ? planGenWindowMinutes : 60) * 60 * 1000,
  max: Number.isFinite(planGenMax) ? planGenMax : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  message: {
    message: "Too many plan generation requests. Please wait a while before trying again.",
  },
});
