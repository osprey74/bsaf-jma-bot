/**
 * Test script: fetches the latest earthquake from JMA,
 * and posts ONE entry to Bluesky to verify the full pipeline.
 */
import "dotenv/config";
import { fetchFeedEntries } from "./poller/jma-feed.js";
import { fetchDetailXml } from "./poller/jma-detail.js";
import { parseEarthquakeXml } from "./parser/earthquake.js";
import { formatEarthquakePost } from "./poster/formatter.js";
import { postToBluesky } from "./poster/bluesky.js";
import { config } from "./config.js";

async function testPost() {
  console.log("=== bsaf-jma-bot test post ===\n");

  const entries = await fetchFeedEntries(config.jma.eqvolFeedUrl, "eqvol");
  const eqEntries = entries.filter((e) => e.disasterType === "earthquake");
  if (eqEntries.length === 0) {
    console.log("No earthquake entries found. Try again later.");
    return;
  }

  // Use the first (most recent) earthquake entry
  const entry = eqEntries[0];
  console.log(`Using: ${entry.title} (${entry.id})\n`);

  const xml = await fetchDetailXml(entry.linkHref);
  if (!xml) {
    console.log("Could not fetch detail XML");
    return;
  }

  const info = parseEarthquakeXml(xml);
  if (!info) {
    console.log("Could not parse earthquake info");
    return;
  }

  const post = formatEarthquakePost(info);
  if (!post) {
    console.log("Could not format post");
    return;
  }

  console.log("Post text:");
  console.log(post.text);
  console.log(`\nTags: ${post.tags.join(", ")}`);
  console.log("\nPosting to Bluesky...");

  const uri = await postToBluesky(post);
  console.log(`\n✅ Posted: ${uri}`);
}

testPost().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
