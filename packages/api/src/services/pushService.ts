import webpush from "web-push";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

if (env.pushEnabled) {
  webpush.setVapidDetails(env.vapidSubject as string, env.vapidPublicKey as string, env.vapidPrivateKey as string);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Sends to every subscription (device) a patient has registered, pruning any
// that the push service reports as gone (unsubscribed or uninstalled) rather
// than leaving dead rows to fail on every future reminder.
export async function sendPushToPatient(patientId: string, payload: PushPayload): Promise<void> {
  if (!env.pushEnabled) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { patientId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}
