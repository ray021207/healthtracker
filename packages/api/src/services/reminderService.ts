import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { sendPushToPatient } from "./pushService.js";

const REMINDER_BODY = "You haven't logged your meals and progress today — takes less than a minute.";

export function localDateString(date: Date, timeZone: string): string {
  // en-CA gives YYYY-MM-DD directly, matching how logDate is stored (UTC midnight of that calendar day).
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function localTimeString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

const LOGGED_FLAGS = [
  "breakfastDone",
  "lunchDone",
  "dinnerDone",
  "snack1Done",
  "snack2Done",
  "exerciseDone",
] as const;

// Runs once a minute. For each patient whose chosen local reminder time just
// arrived, checks whether they've already logged anything today and — if
// not, and a reminder hasn't already gone out today — sends one push.
export async function checkAndSendReminders(now: Date = new Date()): Promise<void> {
  if (!env.pushEnabled) return;

  const patients = await prisma.patient.findMany({
    where: { reminderEnabled: true, reminderTime: { not: null }, reminderTimezone: { not: null }, isActive: true },
    select: { id: true, reminderTime: true, reminderTimezone: true, reminderLastSentDate: true },
  });

  for (const patient of patients) {
    const timezone = patient.reminderTimezone as string;
    let currentLocalTime: string;
    let todayStr: string;
    try {
      currentLocalTime = localTimeString(now, timezone);
      todayStr = localDateString(now, timezone);
    } catch {
      continue; // invalid/unsupported timezone string — skip rather than crash the loop
    }

    if (currentLocalTime !== patient.reminderTime) continue;

    const alreadySentToday = patient.reminderLastSentDate
      ? localDateString(patient.reminderLastSentDate, timezone) === todayStr
      : false;
    if (alreadySentToday) continue;

    const todayLog = await prisma.dailyLog.findUnique({
      where: { patientId_logDate: { patientId: patient.id, logDate: new Date(`${todayStr}T00:00:00.000Z`) } },
    });
    const hasLoggedToday = todayLog != null && LOGGED_FLAGS.some((flag) => todayLog[flag]);
    if (hasLoggedToday) {
      await prisma.patient.update({ where: { id: patient.id }, data: { reminderLastSentDate: now } });
      continue;
    }

    try {
      await sendPushToPatient(patient.id, {
        title: "HECOS",
        body: REMINDER_BODY,
        url: "/track",
      });
    } catch (error) {
      logger.error("reminder_push_failed", { patientId: patient.id, message: error instanceof Error ? error.message : String(error) });
    }
    await prisma.patient.update({ where: { id: patient.id }, data: { reminderLastSentDate: now } });
  }
}

export function startReminderScheduler(): void {
  if (!env.pushEnabled) return;
  setInterval(() => {
    checkAndSendReminders().catch((error) => {
      logger.error("reminder_scheduler_failed", { message: error instanceof Error ? error.message : String(error) });
    });
  }, 60_000);
}
