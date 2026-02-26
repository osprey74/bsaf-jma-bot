import "dotenv/config";
import fs from "node:fs";
import { config } from "./config.js";
import { fetchFeedEntries, type FeedEntry } from "./poller/jma-feed.js";
import { fetchDetailXml } from "./poller/jma-detail.js";
import { parseEarthquakeXml } from "./parser/earthquake.js";
import { formatEarthquakePost } from "./poster/formatter.js";
import { getAgent, postToBluesky } from "./poster/bluesky.js";
import { DedupStore } from "./storage/dedup.js";
import { logger } from "./utils/logger.js";

// Ensure data directory exists
fs.mkdirSync(config.dataDir, { recursive: true });

const dedup = new DedupStore(config.dbPath);
let lastPostTime = 0;

/**
 * Dispatch a feed entry to the appropriate parser and formatter.
 * Returns a BsafPost if successful, or null to skip.
 */
async function processEntry(entry: FeedEntry) {
  switch (entry.disasterType) {
    case "earthquake":
      return processEarthquake(entry);

    // Step 2: tsunami, eruption, ashfall, nankai-trough
    // Step 3: special-warning, weather-warning, landslide-warning, tornado-warning, heavy-rain

    default:
      logger.info(
        "DISPATCH",
        `Type "${entry.disasterType}" not yet implemented, skipping`
      );
      return null;
  }
}

/** Process an earthquake entry: fetch detail XML → parse → format. */
async function processEarthquake(entry: FeedEntry) {
  const xml = await fetchDetailXml(entry.linkHref);
  if (!xml) {
    logger.warn("DETAIL", `Detail XML unavailable for ${entry.id}`);
    return null;
  }

  const info = parseEarthquakeXml(xml);
  if (!info) {
    logger.warn("PARSE", `Parse failed for ${entry.id}`);
    return null;
  }

  const post = formatEarthquakePost(info);
  if (!post) {
    logger.warn("FORMAT", `No target region for ${entry.id}`);
    return null;
  }

  return post;
}

async function poll(): Promise<void> {
  try {
    // Fetch entries from both feeds in parallel
    const [eqvolEntries, extraEntries] = await Promise.all([
      fetchFeedEntries(config.jma.eqvolFeedUrl, "eqvol"),
      fetchFeedEntries(config.jma.extraFeedUrl, "extra"),
    ]);
    const entries = [...eqvolEntries, ...extraEntries];

    for (const entry of entries) {
      // Skip already-processed entries
      if (dedup.has(entry.id)) continue;

      const post = await processEntry(entry);
      if (!post) {
        dedup.add(entry.id); // Mark to avoid retrying
        continue;
      }

      // Enforce minimum posting interval
      const now = Date.now();
      const elapsed = now - lastPostTime;
      if (elapsed < config.posting.minIntervalMs) {
        const wait = config.posting.minIntervalMs - elapsed;
        await sleep(wait);
      }

      // Post to Bluesky
      try {
        await postToBluesky(post);
        lastPostTime = Date.now();
        dedup.add(entry.id);
      } catch (err) {
        logger.error(
          "POST",
          `Failed to post ${entry.id}: ${err instanceof Error ? err.message : String(err)}`
        );
        // Don't mark as posted — will retry next cycle
      }
    }
  } catch (err) {
    logger.error(
      "POLL",
      `Poll cycle failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function main(): Promise<void> {
  logger.info("MAIN", "bsaf-jma-bot starting...");
  logger.info("MAIN", `Poll interval: ${config.jma.pollIntervalMs}ms`);
  logger.info("MAIN", `Data dir: ${config.dataDir}`);
  logger.info("MAIN", "Feeds: eqvol.xml, extra.xml");

  // Validate credentials by connecting early
  await getAgent();

  // Initial poll
  await poll();

  // Start polling loop
  setInterval(poll, config.jma.pollIntervalMs);
  logger.info("MAIN", "Polling started");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("MAIN", "Shutting down...");
  dedup.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  logger.info("MAIN", "Shutting down...");
  dedup.close();
  process.exit(0);
});

main().catch((err) => {
  logger.error("MAIN", `Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
