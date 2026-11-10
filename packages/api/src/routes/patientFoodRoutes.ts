import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { foodAnalysisRateLimiter } from "../middleware/rateLimit.js";
import { createAuditLog } from "../services/auditLogService.js";
import { analyzeFoodPhoto, analyzeFoodText, PHOTO_MEDIA_TYPES } from "../services/foodAnalysisService.js";
import {
  dateOnly,
  encryptGlucoseValue,
  getDaySummary,
  getIsDiabetic,
  publicGlucoseReading,
  syncMealFlags,
  toIsoDate,
} from "../services/foodLogService.js";
import { glucoseRangesFor } from "../utils/glucoseRanges.js";
import { getClientIp, getUserAgent } from "../utils/requestMeta.js";

// Mounted inside patientRoutes, after authenticate + authorizeRole("PATIENT").
const router = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const plateCategory = z.enum(["NONSTARCHY_VEG", "PROTEIN", "CARB", "FAT_OTHER", "DRINK"]);

const analyzeTextSchema = z.object({ text: z.string().trim().min(2).max(500) });

const analyzePhotoSchema = z.object({
  // The client downsizes photos to roughly a megapixel before upload; this is a hard ceiling.
  imageBase64: z.string().min(100).max(6_000_000),
  mediaType: z.enum(PHOTO_MEDIA_TYPES),
  caption: z.string().trim().max(200).optional(),
});

const foodItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(1000),
  unit: z.string().trim().min(1).max(30),
  calories: z.number().min(0).max(5000),
  carbsG: z.number().min(0).max(1000).default(0),
  proteinG: z.number().min(0).max(1000).default(0),
  fatG: z.number().min(0).max(1000).default(0),
  plateCategory,
  volumeCups: z.number().min(0).max(20).default(0),
  source: z.enum(["MANUAL", "AI_TEXT", "AI_PHOTO"]).default("MANUAL"),
});

const createFoodSchema = z.object({
  logDate: isoDate,
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  items: z.array(foodItemInputSchema).min(1).max(25),
});

const glucoseInputSchema = z.object({
  logDate: isoDate,
  valueMgDl: z.number().min(20).max(600),
  context: z.enum(["FASTING", "BEFORE_MEAL", "AFTER_MEAL", "BEDTIME", "OTHER"]),
  measuredAt: z.string().datetime().optional(),
});

const todayIso = () => new Date().toISOString().slice(0, 10);

function audit(req: Parameters<typeof getClientIp>[0], resourceType: string, resourceId: string) {
  return createAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "UPDATE_DAILY_LOG",
    resourceType,
    resourceId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    patientId: req.user!.id,
  });
}

router.post("/food/analyze", foodAnalysisRateLimiter, async (req, res, next) => {
  try {
    const { text } = analyzeTextSchema.parse(req.body);
    const result = await analyzeFoodText(text);
    res.status(200).json({ items: result.items, note: result.note ?? null, estimated: true });
  } catch (error) {
    logger.error("food_analysis_failed", { kind: "text", message: error instanceof Error ? error.message : String(error) });
    next(error);
  }
});

router.post("/food/analyze-photo", foodAnalysisRateLimiter, async (req, res, next) => {
  try {
    const { imageBase64, mediaType, caption } = analyzePhotoSchema.parse(req.body);
    const result = await analyzeFoodPhoto(imageBase64, mediaType, caption);
    res.status(200).json({ items: result.items, note: result.note ?? null, estimated: true });
  } catch (error) {
    logger.error("food_analysis_failed", { kind: "photo", message: error instanceof Error ? error.message : String(error) });
    next(error);
  }
});

router.get("/food", async (req, res, next) => {
  try {
    const date = isoDate.parse(typeof req.query.date === "string" ? req.query.date : todayIso());
    res.status(200).json(await getDaySummary(req.user!.id, dateOnly(date)));
  } catch (error) {
    next(error);
  }
});

router.post("/food", async (req, res, next) => {
  try {
    const patientId = req.user!.id;
    const parsed = createFoodSchema.parse(req.body);
    const logDate = dateOnly(parsed.logDate);

    await prisma.foodEntry.createMany({
      data: parsed.items.map((item) => ({ ...item, patientId, logDate, mealType: parsed.mealType })),
    });
    await syncMealFlags(patientId, logDate);
    await audit(req, "FoodEntry", patientId);

    res.status(201).json(await getDaySummary(patientId, logDate));
  } catch (error) {
    next(error);
  }
});

router.delete("/food/:id", async (req, res, next) => {
  try {
    const patientId = req.user!.id;
    const entry = await prisma.foodEntry.findFirst({ where: { id: req.params.id, patientId } });
    if (!entry) {
      res.status(404).json({ message: "Food entry not found" });
      return;
    }

    await prisma.foodEntry.delete({ where: { id: entry.id } });
    await syncMealFlags(patientId, entry.logDate);
    await audit(req, "FoodEntry", entry.id);

    res.status(200).json(await getDaySummary(patientId, entry.logDate));
  } catch (error) {
    next(error);
  }
});

router.get("/glucose", async (req, res, next) => {
  try {
    const patientId = req.user!.id;
    const date = isoDate.parse(typeof req.query.date === "string" ? req.query.date : todayIso());
    const readings = await prisma.glucoseReading.findMany({
      where: { patientId, logDate: dateOnly(date) },
      orderBy: { measuredAt: "asc" },
    });
    res.status(200).json({
      readings: readings.map(publicGlucoseReading),
      referenceRanges: glucoseRangesFor(await getIsDiabetic(patientId)),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/glucose", async (req, res, next) => {
  try {
    const patientId = req.user!.id;
    const parsed = glucoseInputSchema.parse(req.body);

    const reading = await prisma.glucoseReading.create({
      data: {
        patientId,
        logDate: dateOnly(parsed.logDate),
        measuredAt: parsed.measuredAt ? new Date(parsed.measuredAt) : new Date(),
        valueMgDl: encryptGlucoseValue(parsed.valueMgDl),
        context: parsed.context,
      },
    });
    await audit(req, "GlucoseReading", reading.id);

    res.status(201).json({ reading: publicGlucoseReading(reading) });
  } catch (error) {
    next(error);
  }
});

router.delete("/glucose/:id", async (req, res, next) => {
  try {
    const patientId = req.user!.id;
    const reading = await prisma.glucoseReading.findFirst({ where: { id: req.params.id, patientId } });
    if (!reading) {
      res.status(404).json({ message: "Reading not found" });
      return;
    }
    await prisma.glucoseReading.delete({ where: { id: reading.id } });
    await audit(req, "GlucoseReading", reading.id);
    res.status(200).json({ deleted: true, logDate: toIsoDate(reading.logDate) });
  } catch (error) {
    next(error);
  }
});

export default router;
