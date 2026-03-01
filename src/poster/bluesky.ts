import { BskyAgent, RichText } from "@atproto/api";
import { config } from "../config.js";
import {
  loadSession,
  saveSession,
  type StoredSession,
} from "../storage/session-store.js";
import { logger } from "../utils/logger.js";

let agent: BskyAgent | null = null;

export async function getAgent(): Promise<BskyAgent> {
  if (agent) return agent;

  const ag = new BskyAgent({ service: config.bluesky.service });

  // Try to resume from env vars (for initial deployment where login may be rate-limited)
  const envSession = process.env.BLUESKY_SESSION_JSON;
  const saved = envSession ? JSON.parse(envSession) as StoredSession : loadSession(config.sessionPath);
  if (saved) {
    try {
      await ag.resumeSession({
        accessJwt: saved.accessJwt,
        refreshJwt: saved.refreshJwt,
        handle: saved.handle,
        did: saved.did,
        active: true,
      });
      // Verify session is actually valid
      if (ag.session?.did) {
        logger.info("BLUESKY", `Resumed session as ${saved.handle}`);
        persistSession(ag);
        agent = ag;
        return agent;
      }
      logger.warn("BLUESKY", "Resumed session has no DID, logging in fresh");
    } catch (err) {
      logger.warn("BLUESKY", "Failed to resume session, logging in fresh", { error: err });
    }
  }

  // Fresh login
  const { identifier, appPassword } = config.bluesky;
  if (!identifier || !appPassword) {
    throw new Error(
      "BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set"
    );
  }
  await ag.login({ identifier, password: appPassword });
  logger.info("BLUESKY", `Logged in as ${identifier}`);
  persistSession(ag);
  agent = ag;
  return agent;
}

/** Reset cached agent so next getAgent() call re-authenticates */
export function resetAgent(): void {
  agent = null;
}

function persistSession(ag: BskyAgent): void {
  const s = ag.session;
  if (!s) return;
  const data: StoredSession = {
    accessJwt: s.accessJwt,
    refreshJwt: s.refreshJwt,
    handle: s.handle,
    did: s.did,
  };
  saveSession(config.sessionPath, data);
}

export interface BsafPost {
  text: string;
  tags: string[];
  langs: string[];
}

export async function postToBluesky(post: BsafPost): Promise<string> {
  let ag = await getAgent();

  try {
    const rt = new RichText({ text: post.text });
    await rt.detectFacets(ag);

    const result = await ag.post({
      text: rt.text,
      facets: rt.facets,
      tags: post.tags,
      langs: post.langs,
    });

    // Persist session after successful post (tokens may have refreshed)
    persistSession(ag);

    const uri = result.uri;
    logger.info("POST", `Success: ${uri}`);
    logger.info("TAGS", post.tags.join(","));
    return uri;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Not logged in") || msg.includes("AuthRequired")) {
      logger.warn("BLUESKY", "Session invalid, re-authenticating...");
      resetAgent();
      ag = await getAgent();

      const rt = new RichText({ text: post.text });
      await rt.detectFacets(ag);
      const result = await ag.post({
        text: rt.text,
        facets: rt.facets,
        tags: post.tags,
        langs: post.langs,
      });
      persistSession(ag);
      const uri = result.uri;
      logger.info("POST", `Success (after re-auth): ${uri}`);
      logger.info("TAGS", post.tags.join(","));
      return uri;
    }
    throw err;
  }
}
