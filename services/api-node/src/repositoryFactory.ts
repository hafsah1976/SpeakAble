import type { Settings } from "./config.js";
import type { AppRepository } from "./types.js";
import { MemoryRepository } from "./repositories/memoryRepository.js";
import { MongoRepository } from "./repositories/mongoRepository.js";

export function createRepository(settings: Settings): AppRepository {
  return settings.dataStore === "mongo" ? new MongoRepository() : new MemoryRepository();
}
