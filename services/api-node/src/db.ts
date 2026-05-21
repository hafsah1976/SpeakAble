import mongoose from "mongoose";
import type { Settings } from "./config.js";

export async function connectDatabase(settings: Settings): Promise<void> {
  if (settings.dataStore !== "mongo") {
    return;
  }

  if (!settings.mongodbUri) {
    throw new Error("MongoDB connection is not configured.");
  }

  await mongoose.connect(settings.mongodbUri, {
    autoIndex: settings.nodeEnv !== "production"
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
