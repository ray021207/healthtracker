import { createContext, useContext, useRef, useState, type ReactNode } from "react";

import { api } from "./api";
import { useAuth } from "./auth";

interface PlanGenerationState {
  generating: boolean;
  status: string | null;
  error: string | null;
  generatePlan: () => Promise<void>;
  dismiss: () => void;
}

const PlanGenerationContext = createContext<PlanGenerationState | null>(null);

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 4 * 60_000;

// Lives above the router so a request stays tracked (and its result surfaces
// wherever the patient ends up) even if they navigate to another tab while
// the plan is generating. The underlying fetch already isn't cancelled by an
// in-app route change — this just keeps the UI in sync with it.
export function PlanGenerationProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Generation itself takes 1-2 minutes; the backend no longer holds that
  // request open (a connection held that long risked being killed by the
  // phone's network, the browser, or a proxy — which showed up as "Load
  // failed" even when the plan had actually finished generating). Instead it
  // responds immediately once generation has *started*, and this polls for
  // the result showing up.
  const generatePlan = async () => {
    if (inFlight.current || !accessToken) return;
    inFlight.current = true;
    setGenerating(true);
    setError(null);
    setStatus("Generating your 90-day plan… this takes about a minute. Feel free to keep using the app.");

    const requestedAt = Date.now();
    try {
      await api.generatePlan(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus(null);
      setGenerating(false);
      inFlight.current = false;
      return;
    }

    const poll = async () => {
      const res = await api.getPlan(accessToken);
      const plan = res?.plan as { generatedAt?: string; regeneratedAt?: string } | undefined;
      const planTimestamp = plan?.regeneratedAt ?? plan?.generatedAt;
      const isReady = planTimestamp != null && new Date(planTimestamp).getTime() >= requestedAt - 5_000;

      if (isReady) {
        setStatus("Plan generated successfully!");
        setGenerating(false);
        inFlight.current = false;
        return;
      }

      if (Date.now() - requestedAt >= POLL_TIMEOUT_MS) {
        setStatus("Still working on your plan — check My Plan again in a few minutes.");
        setGenerating(false);
        inFlight.current = false;
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  const dismiss = () => {
    setStatus(null);
    setError(null);
  };

  return (
    <PlanGenerationContext.Provider value={{ generating, status, error, generatePlan, dismiss }}>
      {children}
    </PlanGenerationContext.Provider>
  );
}

export function usePlanGeneration() {
  const ctx = useContext(PlanGenerationContext);
  if (!ctx) throw new Error("usePlanGeneration must be used inside PlanGenerationProvider");
  return ctx;
}
