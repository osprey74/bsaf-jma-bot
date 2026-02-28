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

  agent = new BskyAgent({ service: config.bluesky.service });

  // Try to resume saved session
  const saved = loadSession(config.sessionPath);
  if (saved) {
    try {
      await agent.resumeSession({
        accessJwt: saved.accessJwt,
        refreshJwt: saved.refreshJwt,
        handle: saved.handle,
        did: saved.did,
        active: true,
      });
      logger.info("BLUESKY", `Resumed session as ${saved.handle}`);
      persistSession(agent);
      return agent;
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
  await agent.login({ identifier, password: appPassword });
  logger.info("BLUESKY", `Logged in as ${identifier}`);
  persistSession(agent);
  return agent;
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
  const ag = await getAgent();

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
}
