import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../utils/jwt.js";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.header("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookieToken = req.cookies?.mh_access_token;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const payload = verifyAccessToken(token);

    if (!payload.sub || (payload.role !== "ADMIN" && payload.role !== "PATIENT")) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      clinicId: payload.clinicId,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
