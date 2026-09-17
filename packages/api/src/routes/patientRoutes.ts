import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { createAuditLog } from "../services/auditLogService.js";
import { generatePatientPlan, getPatientPlan } from "../services/planGenerationService.js";
import { generateDietPDF, generateExercisePDF } from "../services/pdfService.js";
import { getPatientProgressStats } from "../services/progressService.js";
import { getClientIp, getUserAgent } from "../utils/requestMeta.js";
import { ActivityLevel, DietStyle } from "@prisma/client";
import {
  calculateBMI,
  calculateBMR,
  calculateDailyCalorieTarget,
  calculateMacros,
  calculateTDEE,
  calculateTargetWeight,
} from "../utils/clinicalCalculations.js";
import { normalizeWeightToLb } from "../utils/unitNormalization.js";
import { decryptHealthProfileFields, encryptHealthProfileFields } from "../utils/healthProfileCrypto.js";

const router = Router();

router.use(authenticate, authorizeRole("PATIENT"));

const dayParamSchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(90),
});

const dateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const dailyLogInputSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayNumber: z.number().int().min(1).max(90),
  breakfastDone: z.boolean().optional(),
  lunchDone: z.boolean().optional(),
  dinnerDone: z.boolean().optional(),
  snack1Done: z.boolean().optional(),
  snack2Done: z.boolean().optional(),
  waterLitres: z.number().min(0).max(400).optional(),
  mealNotes: z.string().max(1000).optional(),
  exerciseDone: z.boolean().optional(),
  exerciseDuration: z.number().int().min(0).max(720).optional(),
  exerciseNotes: z.string().max(1000).optional(),
  weightKg: z.number().min(70).max(500).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  createdOffline: z.boolean().optional(),
});

const bulkSyncSchema = z.object({
  logs: z.array(dailyLogInputSchema).max(180),
});

const patientHealthProfileSchema = z.object({
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
  includeAyurvedic: z.boolean().optional().default(true),
  includeAntiInflammatory: z.boolean().optional().default(false),
});

function calcPatientAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const m = now.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

router.get("/profile", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: req.user.id },
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

    res.status(200).json({ profile: patient });
  } catch (error) {
    next(error);
  }
});

router.get("/health-profile", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const profile = await prisma.healthProfile.findUnique({
      where: { patientId: req.user.id },
    });

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "VIEW_HEALTH_PROFILE",
      resourceType: "HealthProfile",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

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

router.get("/plan", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const plan = await getPatientPlan(req.user.id);
    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "VIEW_PLAN",
      resourceType: "GeneratedPlan",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({ plan });
  } catch (error) {
    next(error);
  }
});

router.get("/plan/today", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const plan = await getPatientPlan(req.user.id);
    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    const dayNumber = Math.max(
      1,
      Math.min(
        90,
        Math.floor((Date.now() - new Date(plan.startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1,
      ),
    );

    const dietDays = Array.isArray(plan.dietPlan) ? plan.dietPlan : [];
    const exerciseDays = Array.isArray(plan.exercisePlan) ? plan.exercisePlan : [];

    const dietDay = dietDays.find((entry) => Number((entry as { day?: unknown }).day) === dayNumber) ?? null;
    const exerciseDay =
      exerciseDays.find((entry) => Number((entry as { day?: unknown }).day) === dayNumber) ?? null;

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "VIEW_PLAN",
      resourceType: "GeneratedPlan",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({ dayNumber, dietDay, exerciseDay });
  } catch (error) {
    next(error);
  }
});

router.get("/plan/day/:dayNumber", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsed = dayParamSchema.parse(req.params);

    const plan = await getPatientPlan(req.user.id);
    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    const dietDays = Array.isArray(plan.dietPlan) ? plan.dietPlan : [];
    const exerciseDays = Array.isArray(plan.exercisePlan) ? plan.exercisePlan : [];

    const dietDay =
      dietDays.find((entry) => Number((entry as { day?: unknown }).day) === parsed.dayNumber) ?? null;
    const exerciseDay =
      exerciseDays.find((entry) => Number((entry as { day?: unknown }).day) === parsed.dayNumber) ?? null;

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "VIEW_PLAN",
      resourceType: "GeneratedPlan",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({ dayNumber: parsed.dayNumber, dietDay, exerciseDay });
  } catch (error) {
    next(error);
  }
});

router.get("/logs", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const logs = await prisma.dailyLog.findMany({
      where: { patientId: req.user.id },
      orderBy: { logDate: "desc" },
    });

    res.status(200).json({
      logs: logs.map((log) => ({
        ...log,
        weightKg: typeof log.weightKg === "number" ? normalizeWeightToLb(log.weightKg) : log.weightKg,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/logs/:date", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsed = dateParamSchema.parse(req.params);
    const log = await prisma.dailyLog.findUnique({
      where: {
        patientId_logDate: {
          patientId: req.user.id,
          logDate: new Date(`${parsed.date}T00:00:00.000Z`),
        },
      },
    });

    res.status(200).json({
      log: log
        ? {
            ...log,
            weightKg: typeof log.weightKg === "number" ? normalizeWeightToLb(log.weightKg) : log.weightKg,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logs", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsed = dailyLogInputSchema.parse(req.body);
    const logDate = new Date(`${parsed.logDate}T00:00:00.000Z`);

    const log = await prisma.dailyLog.upsert({
      where: {
        patientId_logDate: {
          patientId: req.user.id,
          logDate,
        },
      },
      create: {
        patientId: req.user.id,
        logDate,
        dayNumber: parsed.dayNumber,
        breakfastDone: parsed.breakfastDone ?? false,
        lunchDone: parsed.lunchDone ?? false,
        dinnerDone: parsed.dinnerDone ?? false,
        snack1Done: parsed.snack1Done ?? false,
        snack2Done: parsed.snack2Done ?? false,
        waterLitres: parsed.waterLitres,
        mealNotes: parsed.mealNotes,
        exerciseDone: parsed.exerciseDone ?? false,
        exerciseDuration: parsed.exerciseDuration,
        exerciseNotes: parsed.exerciseNotes,
        weightKg: parsed.weightKg,
        energyLevel: parsed.energyLevel,
        mood: parsed.mood,
        syncedAt: new Date(),
        createdOffline: parsed.createdOffline ?? false,
      },
      update: {
        dayNumber: parsed.dayNumber,
        breakfastDone: parsed.breakfastDone ?? false,
        lunchDone: parsed.lunchDone ?? false,
        dinnerDone: parsed.dinnerDone ?? false,
        snack1Done: parsed.snack1Done ?? false,
        snack2Done: parsed.snack2Done ?? false,
        waterLitres: parsed.waterLitres,
        mealNotes: parsed.mealNotes,
        exerciseDone: parsed.exerciseDone ?? false,
        exerciseDuration: parsed.exerciseDuration,
        exerciseNotes: parsed.exerciseNotes,
        weightKg: parsed.weightKg,
        energyLevel: parsed.energyLevel,
        mood: parsed.mood,
        syncedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "UPDATE_DAILY_LOG",
      resourceType: "DailyLog",
      resourceId: log.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({ log });
  } catch (error) {
    next(error);
  }
});

router.post("/logs/sync", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsed = bulkSyncSchema.parse(req.body);

    const synced: string[] = [];
    const conflicts: string[] = [];

    for (const entry of parsed.logs) {
      const logDate = new Date(`${entry.logDate}T00:00:00.000Z`);
      const existing = await prisma.dailyLog.findUnique({
        where: {
          patientId_logDate: {
            patientId: req.user.id,
            logDate,
          },
        },
        select: { id: true },
      });

      if (existing) {
        conflicts.push(entry.logDate);
        continue;
      }

      const created = await prisma.dailyLog.create({
        data: {
          patientId: req.user.id,
          logDate,
          dayNumber: entry.dayNumber,
          breakfastDone: entry.breakfastDone ?? false,
          lunchDone: entry.lunchDone ?? false,
          dinnerDone: entry.dinnerDone ?? false,
          snack1Done: entry.snack1Done ?? false,
          snack2Done: entry.snack2Done ?? false,
          waterLitres: entry.waterLitres,
          mealNotes: entry.mealNotes,
          exerciseDone: entry.exerciseDone ?? false,
          exerciseDuration: entry.exerciseDuration,
          exerciseNotes: entry.exerciseNotes,
          weightKg: entry.weightKg,
          energyLevel: entry.energyLevel,
          mood: entry.mood,
          syncedAt: new Date(),
          createdOffline: true,
        },
        select: { id: true },
      });

      synced.push(created.id);
    }

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "UPDATE_DAILY_LOG",
      resourceType: "DailyLogSync",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({
      syncedCount: synced.length,
      conflictCount: conflicts.length,
      conflicts,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/plan/pdf/diet", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const [plan, patient] = await Promise.all([
      getPatientPlan(req.user.id),
      prisma.patient.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true, clinic: { select: { name: true } } },
      }),
    ]);

    if (!plan || !patient) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    const pdf = await generateDietPDF({
      patientName: `${patient.firstName} ${patient.lastName}`,
      clinicName: patient.clinic.name,
      startDate: plan.startDate,
      totalDays: plan.totalDays,
      dietPlan: Array.isArray(plan.dietPlan) ? plan.dietPlan : [],
      exercisePlan: Array.isArray(plan.exercisePlan) ? plan.exercisePlan : [],
      ayurvedicNotes: plan.ayurvedicNotes,
    });

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "EXPORT_PDF",
      resourceType: "DietPlan",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="diet-plan.pdf"');
    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
});

router.get("/plan/pdf/exercise", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const [plan, patient] = await Promise.all([
      getPatientPlan(req.user.id),
      prisma.patient.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true, clinic: { select: { name: true } } },
      }),
    ]);

    if (!plan || !patient) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    const pdf = await generateExercisePDF({
      patientName: `${patient.firstName} ${patient.lastName}`,
      clinicName: patient.clinic.name,
      startDate: plan.startDate,
      totalDays: plan.totalDays,
      dietPlan: Array.isArray(plan.dietPlan) ? plan.dietPlan : [],
      exercisePlan: Array.isArray(plan.exercisePlan) ? plan.exercisePlan : [],
      ayurvedicNotes: plan.ayurvedicNotes,
    });

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "EXPORT_PDF",
      resourceType: "ExercisePlan",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="exercise-plan.pdf"');
    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
});

router.put("/health-profile", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsed = patientHealthProfileSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({
      where: { id: req.user.id },
      select: { id: true, dateOfBirth: true, gender: true },
    });

    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    if (patient.gender === "OTHER") {
      res.status(400).json({ message: "BMR calculation requires MALE or FEMALE gender. Please contact your clinic to update your profile." });
      return;
    }

    const ageYears = calcPatientAge(patient.dateOfBirth);
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
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "UPDATE_HEALTH_PROFILE",
      resourceType: "HealthProfile",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({ healthProfile: decryptHealthProfileFields(healthProfile) });
  } catch (error) {
    next(error);
  }
});

router.post("/generate-plan", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: req.user.id },
      include: { healthProfile: true },
    });

    if (!patient?.healthProfile) {
      res.status(400).json({ message: "Please complete your health profile before generating a plan." });
      return;
    }

    await generatePatientPlan(req.user.id, req.user.id);

    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "GENERATE_PLAN",
      resourceType: "GeneratedPlan",
      resourceId: req.user.id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      patientId: req.user.id,
    });

    res.status(200).json({ message: "Plan generated successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/progress", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const progress = await getPatientProgressStats(req.user.id);

    res.status(200).json({ progress });
  } catch (error) {
    next(error);
  }
});

export default router;
