import type { EarthquakeInfo } from "../parser/types.js";
import { prefCodesToTargetRegions } from "../utils/region-map.js";
import type { BsafPost } from "./bluesky.js";

/**
 * Format an EarthquakeInfo into a BSAF-compliant Bluesky post.
 * Returns one post per target region (a single earthquake may affect multiple regions).
 * The "primary" region (highest intensity) is used for the single post.
 */
export function formatEarthquakePost(info: EarthquakeInfo): BsafPost | null {
  const targets = prefCodesToTargetRegions(info.prefCodes);
  if (targets.length === 0) return null;

  // Use the first target (from the first prefecture listed, which is the highest intensity)
  const primaryTarget = targets[0];

  const emoji = getEmojiForIntensity(info.maxIntensity);

  // Format datetime for display (JST)
  const displayTime = formatJstTime(info.reportDateTime);

  // Build post text (must stay under 300 graphemes)
  const depthStr =
    info.depthKm > 0 ? `深さ約${info.depthKm}km` : "深さ不明";
  const tsunamiStr = info.tsunamiComment || "";

  const text = [
    `${emoji} 地震情報`,
    `${displayTime}ころ、${info.hypocenterName}で地震`,
    `マグニチュード：${info.magnitude}（${depthStr}）`,
    `最大震度：${info.maxIntensity.replace("震度", "")}`,
    tsunamiStr,
    `(情報源: 気象庁)`,
  ]
    .filter(Boolean)
    .join("\n");

  // BSAF tags
  const tags = [
    "bsaf:v1",
    `type:earthquake`,
    `value:${info.maxIntensity}`,
    `time:${info.originTimeUtc}`,
    `target:${primaryTarget}`,
    `source:jma`,
  ];

  return { text, tags, langs: ["ja"] };
}

function getEmojiForIntensity(intensity: string): string {
  if (
    intensity === "震度7" ||
    intensity === "震度6強" ||
    intensity === "震度6弱" ||
    intensity === "震度5強" ||
    intensity === "震度5弱"
  ) {
    return "🔴";
  }
  if (intensity === "震度4" || intensity === "震度3") {
    return "🟠";
  }
  return "🟡";
}

/** Format a JST ISO string to a display string like "25日18時41分" */
function formatJstTime(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  // Convert to JST
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDate();
  const hour = jst.getUTCHours();
  const min = jst.getUTCMinutes().toString().padStart(2, "0");
  return `${day}日${hour}時${min}分`;
}
