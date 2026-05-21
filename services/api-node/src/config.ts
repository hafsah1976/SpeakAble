import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

for (const candidate of [resolve(process.cwd(), "services/api-node/.env"), resolve(process.cwd(), ".env")]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

export type DataStoreMode = "memory" | "mongo";

export interface Settings {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  dataStore: DataStoreMode;
  mongodbUri?: string;
  authRequired: boolean;
  authIssuer?: string;
  authAudience?: string;
  voiceRolePlayEnabled: boolean;
  externalSharingEnabled: boolean;
}

export function getSettings(overrides: Partial<Settings> = {}): Settings {
  const dataStore = env("DATA_STORE", "memory") === "mongo" ? "mongo" : "memory";

  return {
    nodeEnv: env("NODE_ENV", "development"),
    port: Number(env("PORT", "8000")),
    corsOrigins: splitCsv(env("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081")),
    dataStore,
    mongodbUri: emptyToUndefined(env("MONGODB_URI", "")),
    authRequired: readBoolean("AUTH_REQUIRED", false),
    authIssuer: emptyToUndefined(env("AUTH_ISSUER", "")),
    authAudience: emptyToUndefined(env("AUTH_AUDIENCE", "")),
    voiceRolePlayEnabled: readBoolean("VOICE_ROLE_PLAY_ENABLED", false),
    externalSharingEnabled: readBoolean("EXTERNAL_SHARING_ENABLED", false),
    ...overrides
  };
}

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyToUndefined(value: string): string | undefined {
  return value.trim() === "" ? undefined : value;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
