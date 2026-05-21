import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import type { Settings } from "./config.js";
import { getSettings } from "./config.js";
import { authMiddleware } from "./auth.js";
import { RuleBasedCoachProvider, type CoachProvider } from "./domain/coachProvider.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import { buildOpenApiDocument } from "./openapi.js";
import { createRepository } from "./repositoryFactory.js";
import { createV1Router } from "./routes.js";
import type { AppRepository } from "./types.js";

export interface CreateAppOptions {
  settings?: Partial<Settings>;
  repository?: AppRepository;
  coachProvider?: CoachProvider;
}

export function createApp(options: CreateAppOptions = {}) {
  const settings = getSettings(options.settings);
  const repository = options.repository ?? createRepository(settings);
  const coachProvider = options.coachProvider ?? new RuleBasedCoachProvider();
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: settings.corsOrigins,
      credentials: true,
      allowedHeaders: ["Authorization", "Content-Type", "X-Request-ID"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    })
  );
  app.use(express.json({ limit: "128kb" }));
  if (settings.nodeEnv !== "test") {
    app.use(
      pinoHttp({
        redact: {
          paths: ["req.headers.authorization", "req.body", "res.body"],
          remove: true
        },
        quietReqLogger: true
      })
    );
  }

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "speakable-api", version: "0.1.0" });
  });

  app.get("/ready", async (_request, response) => {
    const databaseReady = settings.dataStore === "memory" ? true : await repository.ready();
    const authReady = !settings.authRequired || Boolean(settings.authIssuer && settings.authAudience);
    const ready = databaseReady && authReady;

    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      checks: {
        api: "ok",
        auth: authReady ? "ok" : "missing_config",
        database: databaseReady ? "ok" : "unavailable"
      }
    });
  });

  app.get("/openapi.json", (_request, response) => {
    response.json(buildOpenApiDocument());
  });

  app.use("/v1", authMiddleware(settings), createV1Router(repository, coachProvider));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
