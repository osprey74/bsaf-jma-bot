/**
 * Dry-run script: fetches JMA feeds, parses entries,
 * and prints formatted posts without actually posting to Bluesky.
 *
 * Usage: npx tsx src/dry-run.ts
 */
import { fetchFeedEntries, type FeedEntry } from "./poller/jma-feed.js";
import { fetchDetailXml } from "./poller/jma-detail.js";
import { parseEarthquakeXml } from "./parser/earthquake.js";
import { parseTsunamiXml } from "./parser/tsunami.js";
import { parseEruptionXml } from "./parser/eruption.js";
import { parseAshfallContent } from "./parser/ashfall.js";
import { parseNankaiTroughXml } from "./parser/nankai-trough.js";
import { parseSpecialWarningXml } from "./parser/special-warning.js";
import { parseWeatherWarningXml, parseWeatherWarningContent } from "./parser/weather-warning.js";
import { parseLandslideWarningContent } from "./parser/landslide-warning.js";
import { parseTornadoWarningContent } from "./parser/tornado-warning.js";
import { parseHeavyRainContent } from "./parser/heavy-rain.js";
import {
  formatEarthquakePost,
  formatTsunamiPost,
  formatEruptionPost,
  formatAshfallPost,
  formatNankaiTroughPost,
  formatSpecialWarningPost,
  formatWeatherWarningPost,
  formatLandslideWarningPost,
  formatTornadoWarningPost,
  formatHeavyRainPost,
} from "./poster/formatter.js";
import { determinePriority } from "./poster/priority.js";
import { config } from "./config.js";
import type { BsafPost } from "./poster/bluesky.js";

async function processEntry(entry: FeedEntry): Promise<BsafPost | null> {
  switch (entry.disasterType) {
    case "earthquake": {
      const xml = await fetchDetailXml(entry.linkHref);
      if (!xml) return null;
      const info = parseEarthquakeXml(xml);
      if (!info) return null;
      return formatEarthquakePost(info);
    }
    case "tsunami": {
      const xml = await fetchDetailXml(entry.linkHref);
      if (!xml) return null;
      const info = parseTsunamiXml(xml);
      if (!info) return null;
      return formatTsunamiPost(info);
    }
    case "eruption": {
      const xml = await fetchDetailXml(entry.linkHref);
      if (!xml) return null;
      const info = parseEruptionXml(xml);
      if (!info) return null;
      return formatEruptionPost(info);
    }
    case "ashfall": {
      const info = parseAshfallContent(entry.content, entry.title, entry.updated);
      if (!info) return null;
      return formatAshfallPost(info);
    }
    case "nankai-trough": {
      const xml = await fetchDetailXml(entry.linkHref);
      if (!xml) return null;
      const info = parseNankaiTroughXml(xml);
      if (!info) return null;
      return formatNankaiTroughPost(info);
    }
    case "special-warning": {
      const xml = await fetchDetailXml(entry.linkHref);
      if (!xml) return null;
      const info = parseSpecialWarningXml(xml);
      if (!info) return null;
      return formatSpecialWarningPost(info);
    }
    case "weather-warning": {
      if (entry.needsDetailXml) {
        const xml = await fetchDetailXml(entry.linkHref);
        if (!xml) return null;
        const info = parseWeatherWarningXml(xml);
        if (!info) return null;
        return formatWeatherWarningPost(info);
      }
      const info = parseWeatherWarningContent(entry.content, entry.title, entry.updated);
      if (!info) return null;
      return formatWeatherWarningPost(info);
    }
    case "landslide-warning": {
      const info = parseLandslideWarningContent(entry.content, entry.title, entry.updated);
      if (!info) return null;
      return formatLandslideWarningPost(info);
    }
    case "tornado-warning": {
      const info = parseTornadoWarningContent(entry.content, entry.title, entry.updated);
      if (!info) return null;
      return formatTornadoWarningPost(info);
    }
    case "heavy-rain": {
      const info = parseHeavyRainContent(entry.content, entry.title, entry.updated);
      if (!info) return null;
      return formatHeavyRainPost(info);
    }
    default:
      return null;
  }
}

async function dryRun() {
  console.log("=== bsaf-jma-bot dry run ===\n");

  const [eqvolEntries, extraEntries] = await Promise.all([
    fetchFeedEntries(config.jma.eqvolFeedUrl, "eqvol"),
    fetchFeedEntries(config.jma.extraFeedUrl, "extra"),
  ]);
  const entries = [...eqvolEntries, ...extraEntries];
  console.log(`Found ${entries.length} entries total\n`);

  // Collect results with priority
  const results: { entry: FeedEntry; post: BsafPost; priority: number }[] = [];
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    const post = await processEntry(entry);
    if (!post) {
      failed++;
      continue;
    }
    const priority = determinePriority(post.tags);
    results.push({ entry, post, priority });
  }

  // Sort by priority
  results.sort((a, b) => a.priority - b.priority);

  // Display
  for (const { entry, post, priority } of results) {
    console.log(`--- P${priority} | ${entry.disasterType}: ${entry.title} ---`);
    console.log("\n  " + post.text.split("\n").join("\n  "));
    console.log(`\n  Tags: ${post.tags.join(", ")}`);
    console.log();
  }

  // Summary
  const typeCounts = new Map<string, number>();
  for (const r of results) {
    typeCounts.set(r.entry.disasterType, (typeCounts.get(r.entry.disasterType) ?? 0) + 1);
  }

  console.log("=== Summary ===");
  console.log(`Total entries: ${entries.length}`);
  console.log(`Formatted: ${results.length} | Skipped/filtered: ${failed}`);
  console.log(`By type: ${[...typeCounts.entries()].map(([t, c]) => `${t}=${c}`).join(", ")}`);
  console.log(`By priority: ${[0, 1, 2, 3, 4].map(p => `P${p}=${results.filter(r => r.priority === p).length}`).join(", ")}`);
}

dryRun().catch(console.error);
