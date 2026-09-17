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

  const generatePlan = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setGenerating(true);
    setError(null);
    setStatus("Generating your 90-day plan… this takes about a minute. Feel free to keep using the app.");
    try {
      const res = await api.generatePlan(accessToken!);
      setStatus(res.message ?? "Plan generated successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus(null);
    } finally {
      setGenerating(false);
      inFlight.current = false;
    }
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
