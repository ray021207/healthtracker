import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    logger.info("http_request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      actorId: req.user?.id,
      actorRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
}
