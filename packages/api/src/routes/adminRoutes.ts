import bcrypt from "bcrypt";
import { ActivityLevel, DietStyle, Gender } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { createAuditLog } from "../services/auditLogService.js";
import {
  ensurePatientInClinic,
  generatePatientPlan,
  getAdminPatientPlan,
} from "../services/planGenerationService.js";
import { getPatientProgressStats } from "../services/progressService.js";
import {
  calculateBMI,
  calculateBMR,
  calculateDailyCalorieTarget,
  calculateMacros,
  calculateTDEE,
  calculateTargetWeight,
} from "../utils/clinicalCalculations.js";
import { generateTemporaryPassword } from "../utils/password.js";
import { getClientIp, getUserAgent } from "../utils/requestMeta.js";
import { normalizeWeightToLb } from "../utils/unitNormalization.js";
import { decryptHealthProfileFields, encryptHealthProfileFields } from "../utils/healthProfileCrypto.js";

const router = Router();

router.use(authenticate, authorizeRole("ADMIN"));

const patientCreateSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: z.coerce.date(),
  gender: z.nativeEnum(Gender),
});

const patientUpdateSchema = patientCreateSchema.partial().refine((input) => Object.keys(input).length > 0, {
  message: "At least one field must be provided",
});

const healthProfileUpsertSchema = z.object({
  heightCm: z.number().min(80).max(260),
  weightKg: z.number().min(70).max(500),
  ldlMgDl: z.number().min(1).max(500).optional(),
  hdlMgDl: z.number().min(1).max(200).optional(),
  triglyceridesMgDl: z.number().min(1).max(1500).optional(),
  fastingGlucoseMgDl: z.number().min(1).max(500).optional(),
  hba1cPercent: z.number().min(1).max(20).optional(),
  isDiabetic: z.boolean().optional().default(false),
  systolicBp: z.number().int().min(60).max(260).optional(),
  diastolicBp: z.number().int().min(40).max(180).optional(),
  activityLevel: z.nativeEnum(ActivityLevel),
  dietStyle: z.nativeEnum(DietStyle),
  dietaryRestrictions: z.array(z.string().trim().min(1).max(100)).default([]),
  allergies: z.array(z.string().trim().min(1).max(100)).default([]),
  medicalConditions: z.array(z.string().trim().min(1).max(150)).default([]),
  medications: z.array(z.string().trim().min(1).max(150)).default([]),
  includeAyurvedic: z.boolean().optional().default(false),
  includeAntiInflammatory: z.boolean().optional().default(false),
});

const auditLogArchiveSchema = z.object({
  olderThanDays: z.number().int().min(1).max(3650).default(90),
});

function calculateAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age;
}

router.get("/patients", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const patients = await prisma.patient.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clinicId: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "VIEW_PATIENT",
      resourceType: "PatientList",
      resourceId: user.clinicId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
    });

    res.status(200).json({ patients });
  } catch (error) {
    next(error);
  }
});

router.post("/patients", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const parsed = patientCreateSchema.parse(req.body);
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const patient = await prisma.patient.create({
      data: {
        clinicId: user.clinicId,
        email: parsed.email,
        passwordHash,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dateOfBirth: parsed.dateOfBirth,
        gender: parsed.gender,
      },
      select: {
        id: true,
        clinicId: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "CREATE_PATIENT",
      resourceType: "Patient",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(201).json({
      patient,
      credentials: {
        email: patient.email,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/patients/:id", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        clinicId: user.clinicId,
      },
      select: {
        id: true,
        clinicId: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "VIEW_PATIENT",
      resourceType: "Patient",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
});

router.put("/patients/:id", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const parsed = patientUpdateSchema.parse(req.body);

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: parsed,
      select: {
        id: true,
        clinicId: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "UPDATE_PATIENT",
      resourceType: "Patient",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:id/archive", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "REVOKE_ACCESS",
      resourceType: "Patient",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:id/unarchive", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: { isActive: true },
      select: { id: true, isActive: true },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "UPDATE_PATIENT",
      resourceType: "Patient",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
});

// Backward compatible route used by older clients.
router.delete("/patients/:id/deactivate", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "REVOKE_ACCESS",
      resourceType: "Patient",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
});

router.delete("/patients/:id", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { patientId: existing.id },
            { actorId: existing.id, actorRole: "PATIENT" },
          ],
        },
      });
      await tx.dailyLog.deleteMany({ where: { patientId: existing.id } });
      await tx.generatedPlan.deleteMany({ where: { patientId: existing.id } });
      await tx.healthProfile.deleteMany({ where: { patientId: existing.id } });
      await tx.patient.delete({ where: { id: existing.id } });
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "UPDATE_PATIENT",
      resourceType: "PatientDeleted",
      resourceId: req.params.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
    });

    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/patients/:id/health-profile", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: {
        id: true,
        healthProfile: true,
      },
    });

    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "VIEW_HEALTH_PROFILE",
      resourceType: "HealthProfile",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    const profile = patient.healthProfile;
    if (!profile) {
      res.status(200).json({ healthProfile: null });
      return;
    }

    res.status(200).json({
      healthProfile: {
        ...decryptHealthProfileFields(profile),
        weightKg: normalizeWeightToLb(profile.weightKg),
        targetWeightKg: normalizeWeightToLb(profile.targetWeightKg),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/patients/:id/health-profile", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const parsed = healthProfileUpsertSchema.parse(req.body);

    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: user.clinicId },
      select: { id: true, dateOfBirth: true, gender: true },
    });

    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    if (patient.gender === "OTHER") {
      res.status(400).json({
        message: "BMR calculation currently supports MALE or FEMALE only. Update patient gender before calculating profile.",
      });
      return;
    }

    const ageYears = calculateAge(patient.dateOfBirth);
    const bmi = calculateBMI(parsed.weightKg, parsed.heightCm);
    const targetWeightKg = calculateTargetWeight(parsed.heightCm);
    const bmr = calculateBMR(parsed.weightKg, parsed.heightCm, ageYears, patient.gender);
    const tdee = calculateTDEE(bmr, parsed.activityLevel);
    const dailyCalorieTarget = calculateDailyCalorieTarget(tdee, parsed.weightKg, targetWeightKg);
    const macros = calculateMacros(dailyCalorieTarget, parsed.dietStyle);
    const encryptedFields = encryptHealthProfileFields(parsed);

    const healthProfile = await prisma.healthProfile.upsert({
      where: { patientId: patient.id },
      create: {
        patientId: patient.id,
        heightCm: parsed.heightCm,
        weightKg: parsed.weightKg,
        targetWeightKg,
        bmi,
        ...encryptedFields,
        isDiabetic: parsed.isDiabetic,
        activityLevel: parsed.activityLevel,
        dietStyle: parsed.dietStyle,
        dietaryRestrictions: parsed.dietaryRestrictions,
        includeAyurvedic: parsed.includeAyurvedic,
        includeAntiInflammatory: parsed.includeAntiInflammatory,
        bmr,
        tdee,
        dailyCalorieTarget,
        dailyProteinG: macros.proteinG,
        dailyCarbsG: macros.carbsG,
        dailyFatG: macros.fatG,
      },
      update: {
        heightCm: parsed.heightCm,
        weightKg: parsed.weightKg,
        targetWeightKg,
        bmi,
        ...encryptedFields,
        isDiabetic: parsed.isDiabetic,
        activityLevel: parsed.activityLevel,
        dietStyle: parsed.dietStyle,
        dietaryRestrictions: parsed.dietaryRestrictions,
        includeAyurvedic: parsed.includeAyurvedic,
        includeAntiInflammatory: parsed.includeAntiInflammatory,
        bmr,
        tdee,
        dailyCalorieTarget,
        dailyProteinG: macros.proteinG,
        dailyCarbsG: macros.carbsG,
        dailyFatG: macros.fatG,
      },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "UPDATE_HEALTH_PROFILE",
      resourceType: "HealthProfile",
      resourceId: patient.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: patient.id,
    });

    res.status(200).json({ healthProfile: decryptHealthProfileFields(healthProfile) });
  } catch (error) {
    next(error);
  }
});

router.post("/patients/:id/generate-plan", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const target = await ensurePatientInClinic(req.params.id, user.clinicId);
    if (!target) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    await generatePatientPlan(target.id, user.id);

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "GENERATE_PLAN",
      resourceType: "GeneratedPlan",
      resourceId: target.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: target.id,
    });

    res.status(200).json({ message: "Plan generated successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/patients/:id/plan", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const plan = await getAdminPatientPlan(req.params.id, user.clinicId);
    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "VIEW_PLAN",
      resourceType: "GeneratedPlan",
      resourceId: req.params.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: req.params.id,
    });

    res.status(200).json({ plan });
  } catch (error) {
    next(error);
  }
});

router.get("/patients/:id/progress", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const target = await ensurePatientInClinic(req.params.id, user.clinicId);
    if (!target) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    const progress = await getPatientProgressStats(target.id);

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "VIEW_PATIENT",
      resourceType: "PatientProgress",
      resourceId: target.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      adminId: user.id,
      patientId: target.id,
    });

    res.status(200).json({ progress });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const resourceType = typeof req.query.resourceType === "string" ? req.query.resourceType : undefined;
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action: action as never } : {}),
        ...(resourceType ? { resourceType } : {}),
        OR: [
          {
            admin: {
              clinicId: user.clinicId,
            },
          },
          {
            patient: {
              clinicId: user.clinicId,
            },
          },
        ],
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        timestamp: true,
        actorId: true,
        actorRole: true,
        action: true,
        resourceType: true,
        resourceId: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    res.status(200).json({ logs });
  } catch (error) {
    next(error);
  }
});

router.post("/audit-logs/archive", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const parsed = auditLogArchiveSchema.parse(req.body ?? {});
    const cutoff = new Date(Date.now() - parsed.olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoff },
        OR: [
          {
            admin: {
              clinicId: user.clinicId,
            },
          },
          {
            patient: {
              clinicId: user.clinicId,
            },
          },
        ],
      },
    });

    res.status(200).json({ deletedCount: result.count });
  } catch (error) {
    next(error);
  }
});

router.delete("/audit-logs", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user?.clinicId) {
      res.status(403).json({ message: "Clinic context missing" });
      return;
    }

    const result = await prisma.auditLog.deleteMany({
      where: {
        OR: [
          {
            admin: {
              clinicId: user.clinicId,
            },
          },
          {
            patient: {
              clinicId: user.clinicId,
            },
          },
        ],
      },
    });

    res.status(200).json({ deletedCount: result.count });
  } catch (error) {
    next(error);
  }
});

export default router;
