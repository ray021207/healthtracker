import { api } from "./api";

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 4 * 60_000;

// Plan generation runs detached server-side (see packages/api's generate-plan
// routes) rather than holding the request open for the full 1-2 minutes it
// takes — holding it open risked the connection getting killed in transit,
// which looked like a failure even when generation actually succeeded.
// Poll until the newly generated plan shows up, or give up after a while.
export async function waitForPlanReady(patientId: string, requestedAt: number): Promise<"ready" | "timeout"> {
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await api.getPlan(patientId).catch(() => null);
    const plan = res?.plan as { generatedAt?: string; regeneratedAt?: string } | null | undefined;
    const planTimestamp = plan?.regeneratedAt ?? plan?.generatedAt;
    if (planTimestamp != null && new Date(planTimestamp).getTime() >= requestedAt - 5_000) {
      return "ready";
    }

    if (Date.now() - requestedAt >= POLL_TIMEOUT_MS) {
      return "timeout";
    }
  }
}
