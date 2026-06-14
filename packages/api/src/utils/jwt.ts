import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";

import { env } from "../config/env.js";

interface TokenPayload {
  sub: string;
  role: "ADMIN" | "PATIENT";
  clinicId?: string;
}

export interface AccessPayload extends TokenPayload {
  iat: number;
  exp: number;
}

export interface RefreshPayload extends TokenPayload {
  tokenId: string;
  iat: number;
  exp: number;
}

function signToken(payload: object, secret: Secret, options: SignOptions): string {
  return jwt.sign(payload, secret, options);
}

export function signAccessToken(payload: TokenPayload): string {
  return signToken(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiry as StringValue,
  });
}

export function signRefreshToken(payload: TokenPayload & { tokenId: string }): string {
  return signToken(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiry as StringValue,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshPayload;
}
