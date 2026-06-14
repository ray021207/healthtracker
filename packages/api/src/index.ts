import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`Monark API v2 listening on port ${env.port} — CORS: ${env.corsOrigins.join(", ")} — plan engine: haiku`);
});
