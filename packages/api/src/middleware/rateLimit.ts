import rateLimit from "express-rate-limit";

import { env } from "../config/env.js";

// Window and max are overridable via env; defaults are lenient in development
// (so local testing doesn't lock you out) and strict in production.
const windowMinutes = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MIN ?? 15);
const maxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX ?? (env.isProd ? 20 : 100));

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
