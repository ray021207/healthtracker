import type { Response } from "express";

import { env } from "../config/env.js";

const ACCESS_COOKIE = "mh_access_token";
const REFRESH_COOKIE = "mh_refresh_token";

const cookieBase = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: env.isProd,
  path: "/",
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, cookieBase);
  res.clearCookie(REFRESH_COOKIE, cookieBase);
}

export function getRefreshTokenFromRequest(refreshCookie: unknown, bodyToken: unknown): string | null {
  if (typeof refreshCookie === "string" && refreshCookie.trim().length > 0) {
    return refreshCookie;
  }

  if (typeof bodyToken === "string" && bodyToken.trim().length > 0) {
    return bodyToken;
  }

  return null;
}
