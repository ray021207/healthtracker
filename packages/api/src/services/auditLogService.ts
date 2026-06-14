import type { AuditAction, Role } from "@prisma/client";

import { prisma } from "../lib/prisma.js";

export interface AuditLogInput {
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  adminId?: string;
  patientId?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      adminId: input.adminId,
      patientId: input.patientId,
    },
  });
}
