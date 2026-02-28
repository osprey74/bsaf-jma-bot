import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";

export interface StoredSession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

export function loadSession(filePath: string): StoredSession | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (data.accessJwt && data.refreshJwt && data.did) {
      logger.info("SESSION", "Loaded saved session");
      return data as StoredSession;
    }
    return null;
  } catch (err) {
    logger.warn("SESSION", "Failed to load session file", { error: err, filePath });
    return null;
  }
}

export function saveSession(
  filePath: string,
  session: StoredSession
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
  logger.info("SESSION", "Session saved");
}
