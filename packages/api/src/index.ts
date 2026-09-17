import app from "./app.js";
import { env } from "./config/env.js";
import { PLAN_MODEL } from "./services/planGenerationService.js";
import { startReminderScheduler } from "./services/reminderService.js";

app.listen(env.port, () => {
  console.log(
    `Monark API v2 listening on port ${env.port} — CORS: ${env.corsOrigins.join(", ")} — plan engine: ${PLAN_MODEL} — push: ${env.pushEnabled ? "enabled" : "disabled"}`,
  );
});

startReminderScheduler();
