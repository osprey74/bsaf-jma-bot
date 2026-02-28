/**
 * Dry-run script: fetches JMA feeds, parses entries,
 * and prints formatted posts without actually posting to Bluesky.
 */
import { fetchFeedEntries } from "./poller/jma-feed.js";
import { fetchDetailXml } from "./poller/jma-detail.js";
import { parseEarthquakeXml } from "./parser/earthquake.js";
import { parseTsunamiXml } from "./parser/tsunami.js";
import { parseEruptionXml } from "./parser/eruption.js";
import { parseAshfallContent } from "./parser/ashfall.js";
import { parseNankaiTroughXml } from "./parser/nankai-trough.js";
import {
  formatEarthquakePost,
  formatTsunamiPost,
  formatEruptionPost,
  formatAshfallPost,
  formatNankaiTroughPost,
} from "./poster/formatter.js";
import { config } from "./config.js";
import type { BsafPost } from "./poster/bluesky.js";

async function dryRun() {
  console.log("=== bsaf-jma-bot dry run ===\n");

  const [eqvolEntries, extraEntries] = await Promise.all([
    fetchFeedEntries(config.jma.eqvolFeedUrl, "eqvol"),
    fetchFeedEntries(config.jma.extraFeedUrl, "extra"),
  ]);
  const entries = [...eqvolEntries, ...extraEntries];
  console.log(`Found ${entries.length} entries total\n`);

  for (const entry of entries) {
    console.log(`--- ${entry.disasterType}: ${entry.title} ---`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Link: ${entry.linkHref}`);

    let post: BsafPost | null = null;

    switch (entry.disasterType) {
      case "earthquake": {
        const xml = await fetchDetailXml(entry.linkHref);
        if (!xml) { console.log("  ⚠ Could not fetch detail XML\n"); continue; }
        const info = parseEarthquakeXml(xml);
        if (!info) { console.log("  ⚠ Parse failed\n"); continue; }
        console.log(`  M${info.magnitude} MaxInt:${info.maxIntensity} ${info.hypocenterName}`);
        post = formatEarthquakePost(info);
        break;
      }
      case "tsunami": {
        const xml = await fetchDetailXml(entry.linkHref);
        if (!xml) { console.log("  ⚠ Could not fetch detail XML\n"); continue; }
        const info = parseTsunamiXml(xml);
        if (!info) { console.log("  ⚠ Parse failed\n"); continue; }
        console.log(`  Areas: ${info.areas.map(a => `${a.kindName}:${a.name}`).join(", ")}`);
        post = formatTsunamiPost(info);
        break;
      }
      case "eruption": {
        const xml = await fetchDetailXml(entry.linkHref);
        if (!xml) { console.log("  ⚠ Could not fetch detail XML\n"); continue; }
        const info = parseEruptionXml(xml);
        if (!info) { console.log("  ⚠ Parse failed\n"); continue; }
        console.log(`  ${info.volcanoName} Level:${info.alertLevel} ${info.warningKind}`);
        post = formatEruptionPost(info);
        break;
      }
      case "ashfall": {
        const info = parseAshfallContent(entry.content, entry.title, entry.updated);
        if (!info) { console.log("  ⚠ Parse failed\n"); continue; }
        console.log(`  ${info.volcanoName} (${info.forecastType})`);
        post = formatAshfallPost(info);
        break;
      }
      case "nankai-trough": {
        const xml = await fetchDetailXml(entry.linkHref);
        if (!xml) { console.log("  ⚠ Could not fetch detail XML\n"); continue; }
        const info = parseNankaiTroughXml(xml);
        if (!info) { console.log("  ⚠ Parse failed\n"); continue; }
        console.log(`  Keyword: ${info.keyword}`);
        post = formatNankaiTroughPost(info);
        break;
      }
      default:
        console.log(`  ⏭ Parser not yet implemented for "${entry.disasterType}"\n`);
        continue;
    }

    if (!post) {
      console.log("  ⚠ Could not format post\n");
      continue;
    }

    console.log("\n  📝 Post text:");
    console.log("  " + post.text.split("\n").join("\n  "));
    console.log(`\n  🏷️  Tags: ${post.tags.join(", ")}`);
    console.log(`  🌐 Langs: ${post.langs.join(", ")}`);
    console.log();
  }
}

dryRun().catch(console.error);
