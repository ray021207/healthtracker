import { randomUUID } from "node:crypto";

import type { Role } from "@prisma/client";
import bcrypt from "bcrypt";

import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { expiryToDate } from "../utils/time.js";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  clinicId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function findUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (admin) {
    return {
      id: admin.id,
      role: "ADMIN" as const,
      clinicId: admin.clinicId,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      passwordHash: admin.passwordHash,
      isActive: admin.isActive,
    };
  }

  const patient = await prisma.patient.findUnique({ where: { email: normalizedEmail } });
  if (patient) {
    return {
      id: patient.id,
      role: "PATIENT" as const,
      clinicId: patient.clinicId,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      passwordHash: patient.passwordHash,
      isActive: patient.isActive,
    };
  }

  return null;
}

async function issueRefreshToken(user: AuthenticatedUser): Promise<string> {
  const tokenId = randomUUID();
  const refreshToken = signRefreshToken({
    sub: user.id,
    role: user.role,
    clinicId: user.clinicId,
    tokenId,
  });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      userRole: user.role,
      expiresAt: expiryToDate(process.env.JWT_REFRESH_EXPIRY ?? "7d"),
      isRevoked: false,
    },
  });

  return refreshToken;
}

function issueAccessToken(user: AuthenticatedUser): string {
  return signAccessToken({
    sub: user.id,
    role: user.role,
    clinicId: user.clinicId,
  });
}

export async function loginWithEmailPassword(email: string, password: string): Promise<{
  user: AuthenticatedUser;
  tokens: AuthTokens;
} | null> {
  const account = await findUserByEmail(email);

  if (!account || !account.isActive) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, account.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  const user: AuthenticatedUser = {
    id: account.id,
    role: account.role,
    clinicId: account.clinicId,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
  };

  const accessToken = issueAccessToken(user);
  const refreshToken = await issueRefreshToken(user);

  return {
    user,
    tokens: { accessToken, refreshToken },
  };
}

export async function rotateRefreshToken(token: string): Promise<{
  user: AuthenticatedUser;
  tokens: AuthTokens;
} | null> {
  const payload = verifyRefreshToken(token);

  const tokenRecord = await prisma.refreshToken.findUnique({ where: { token } });
  if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
    return null;
  }

  const role = payload.role;
  const userId = payload.sub;

  const user =
    role === "ADMIN"
      ? await prisma.admin.findUnique({ where: { id: userId } })
      : await prisma.patient.findUnique({ where: { id: userId } });

  if (!user || !user.isActive) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { token },
    data: { isRevoked: true },
  });

  const authUser: AuthenticatedUser = {
    id: user.id,
    role,
    clinicId: user.clinicId,
    email: user.email,
  };

  const accessToken = issueAccessToken(authUser);
  const refreshToken = await issueRefreshToken(authUser);

  return {
    user: authUser,
    tokens: { accessToken, refreshToken },
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token, isRevoked: false },
    data: { isRevoked: true },
  });
}

export async function resolveUserFromRefreshToken(token: string): Promise<AuthenticatedUser | null> {
  const payload = verifyRefreshToken(token);

  const tokenRecord = await prisma.refreshToken.findUnique({ where: { token } });
  if (!tokenRecord) {
    return null;
  }

  const user =
    payload.role === "ADMIN"
      ? await prisma.admin.findUnique({ where: { id: payload.sub } })
      : await prisma.patient.findUnique({ where: { id: payload.sub } });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    role: payload.role,
    clinicId: user.clinicId,
    email: user.email,
  };
}

export async function changePassword(params: {
  userId: string;
  role: Role;
  currentPassword: string;
  newPassword: string;
}): Promise<boolean> {
  const user =
    params.role === "ADMIN"
      ? await prisma.admin.findUnique({ where: { id: params.userId } })
      : await prisma.patient.findUnique({ where: { id: params.userId } });

  if (!user || !user.isActive) {
    return false;
  }

  const currentPasswordMatches = await bcrypt.compare(params.currentPassword, user.passwordHash);
  if (!currentPasswordMatches) {
    return false;
  }

  const newHash = await bcrypt.hash(params.newPassword, 12);

  if (params.role === "ADMIN") {
    await prisma.admin.update({
      where: { id: params.userId },
      data: { passwordHash: newHash },
    });
  } else {
    await prisma.patient.update({
      where: { id: params.userId },
      data: { passwordHash: newHash },
    });
  }

  await prisma.refreshToken.updateMany({
    where: {
      userId: params.userId,
      userRole: params.role,
      isRevoked: false,
    },
    data: { isRevoked: true },
  });

  return true;
}
