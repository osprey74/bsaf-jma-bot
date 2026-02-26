/**
 * Dry-run script: fetches JMA feeds, parses entries,
 * and prints formatted posts without actually posting to Bluesky.
 */
import { fetchFeedEntries } from "./poller/jma-feed.js";
import { fetchDetailXml } from "./poller/jma-detail.js";
import { parseEarthquakeXml } from "./parser/earthquake.js";
import { formatEarthquakePost } from "./poster/formatter.js";
import { config } from "./config.js";

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

    if (entry.disasterType !== "earthquake") {
      console.log(`  ⏭ Parser not yet implemented for "${entry.disasterType}"\n`);
      continue;
    }

    const xml = await fetchDetailXml(entry.linkHref);
    if (!xml) {
      console.log("  ⚠ Could not fetch detail XML\n");
      continue;
    }

    const info = parseEarthquakeXml(xml);
    if (!info) {
      console.log("  ⚠ Could not parse earthquake info\n");
      continue;
    }

    console.log(`  EventID: ${info.eventId}`);
    console.log(`  Origin: ${info.originTimeUtc}`);
    console.log(`  Location: ${info.hypocenterName}`);
    console.log(`  M${info.magnitude} Depth:${info.depthKm}km MaxInt:${info.maxIntensity}`);
    console.log(`  PrefCodes: ${info.prefCodes.join(", ")}`);
    console.log(`  Tsunami: ${info.tsunamiComment}`);

    const post = formatEarthquakePost(info);
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
