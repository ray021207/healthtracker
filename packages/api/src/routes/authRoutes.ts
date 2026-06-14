import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import { createAuditLog } from "../services/auditLogService.js";
import {
  changePassword,
  loginWithEmailPassword,
  revokeRefreshToken,
  resolveUserFromRefreshToken,
  rotateRefreshToken,
} from "../services/authService.js";
import { clearAuthCookies, getRefreshTokenFromRequest, setAuthCookies } from "../utils/cookies.js";
import { getClientIp, getUserAgent } from "../utils/requestMeta.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from current password",
  });

function isMobileClient(userAgent: string | undefined, explicitHeader: string | undefined): boolean {
  if (explicitHeader === "mobile") {
    return true;
  }

  if (!userAgent) {
    return false;
  }

  return /expo|okhttp|android|iphone|ios/i.test(userAgent);
}

router.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginWithEmailPassword(parsed.email, parsed.password);
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (!result) {
      await createAuditLog({
        actorId: "unknown",
        actorRole: "PATIENT",
        action: "LOGIN_FAILED",
        resourceType: "Auth",
        ipAddress,
        userAgent,
      });

      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    await createAuditLog({
      actorId: result.user.id,
      actorRole: result.user.role,
      action: "LOGIN",
      resourceType: result.user.role,
      resourceId: result.user.id,
      ipAddress,
      userAgent,
      adminId: result.user.role === "ADMIN" ? result.user.id : undefined,
      patientId: result.user.role === "PATIENT" ? result.user.id : undefined,
    });

    const mobile = isMobileClient(req.header("user-agent"), req.header("x-client-type"));

    res.status(200).json({
      user: {
        id: result.user.id,
        role: result.user.role,
        clinicId: result.user.clinicId,
        email: result.user.email,
        firstName: result.user.firstName ?? "",
        lastName: result.user.lastName ?? "",
      },
      accessToken: result.tokens.accessToken,
      refreshToken: mobile ? result.tokens.refreshToken : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", authRateLimiter, async (req, res, next) => {
  try {
    const parsed = refreshSchema.parse(req.body ?? {});
    const suppliedToken = getRefreshTokenFromRequest(req.cookies?.mh_refresh_token, parsed.refreshToken);

    if (!suppliedToken) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }

    const result = await rotateRefreshToken(suppliedToken);

    if (!result) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    const mobile = isMobileClient(req.header("user-agent"), req.header("x-client-type"));

    res.status(200).json({
      accessToken: result.tokens.accessToken,
      refreshToken: mobile ? result.tokens.refreshToken : undefined,
      user: {
        id: result.user.id,
        role: result.user.role,
        clinicId: result.user.clinicId,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authRateLimiter, async (req, res, next) => {
  try {
    const parsed = refreshSchema.parse(req.body ?? {});
    const suppliedToken = getRefreshTokenFromRequest(req.cookies?.mh_refresh_token, parsed.refreshToken);
    const logoutUser = suppliedToken ? await resolveUserFromRefreshToken(suppliedToken) : null;

    if (suppliedToken) {
      await revokeRefreshToken(suppliedToken);
    }

    if (logoutUser) {
      await createAuditLog({
        actorId: logoutUser.id,
        actorRole: logoutUser.role,
        action: "LOGOUT",
        resourceType: logoutUser.role,
        resourceId: logoutUser.id,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        adminId: logoutUser.role === "ADMIN" ? logoutUser.id : undefined,
        patientId: logoutUser.role === "PATIENT" ? logoutUser.id : undefined,
      });
    }

    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
});

router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.parse(req.body);

    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const changed = await changePassword({
      userId: req.user.id,
      role: req.user.role,
      currentPassword: parsed.currentPassword,
      newPassword: parsed.newPassword,
    });

    if (!changed) {
      res.status(400).json({ message: "Current password is incorrect" });
      return;
    }

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "REVOKE_ACCESS",
      resourceType: "Password",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: req.user.role === "ADMIN" ? req.user.id : undefined,
      patientId: req.user.role === "PATIENT" ? req.user.id : undefined,
    });

    clearAuthCookies(res);
    res.status(200).json({ message: "Password changed successfully. Please log in again." });
  } catch (error) {
    next(error);
  }
});

export default router;
