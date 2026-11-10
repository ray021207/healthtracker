import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin denied"));
    },
    credentials: true,
  }),
);

// Meal photos arrive as base64 JSON; only this route gets the larger limit.
app.use("/api/patient/food/analyze-photo", express.json({ limit: "6mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "monark-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/patient", patientRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
