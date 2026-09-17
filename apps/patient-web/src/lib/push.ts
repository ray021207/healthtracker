import { api } from "./api";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// iOS only exposes the Push API to a PWA installed to the home screen —
// a regular Safari/Chrome tab never has PushManager, so isPushSupported()
// already covers that; this is just for a clearer user-facing message.
export function isLikelyInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function enableReminder(reminderTime: string, accessToken: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error(
      isLikelyInstalled()
        ? "This device doesn't support notifications."
        : "Install Monark Health to your home screen first, then enable reminders from there.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const { publicKey } = await api.getPushPublicKey(accessToken);

  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Could not read push subscription details.");
  }

  await api.subscribePush(
    { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
    reminderTime,
    getDeviceTimezone(),
    accessToken,
  );
}

export async function disableReminder(accessToken: string): Promise<void> {
  let endpoint: string | undefined;
  if (isPushSupported()) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
    }
  }
  await api.unsubscribePush(endpoint, accessToken);
}
