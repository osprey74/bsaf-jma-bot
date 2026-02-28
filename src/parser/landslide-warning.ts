import type { LandslideWarningInfo } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Parse landslide warning from a feed entry's content text (no detail XML needed).
 *
 * Content format example:
 * 【高知県土砂災害警戒情報】高知県と高知地方気象台が共同で発表 対象地域：室戸市、安芸市
 */
export function parseLandslideWarningContent(
  content: string,
  title: string,
  updated: string,
): LandslideWarningInfo | null {
  try {
    // Extract prefecture name from content: 【{prefName}土砂災害警戒情報】
    // or from title: "{prefName}土砂災害警戒情報"
    const prefMatch =
      content.match(/【(.+?)土砂災害警戒情報】/) ??
      title.match(/(.+?)土砂災害警戒情報/);
    if (!prefMatch) {
      logger.warn("PARSE", "Could not extract prefecture from landslide warning content");
      return null;
    }

    const prefName = prefMatch[1].trim();
    const timeUtc = toUtcIso(updated);

    const info: LandslideWarningInfo = {
      title,
      timeUtc,
      content,
      prefName,
    };

    logger.info("PARSE", `landslide-warning: ${prefName}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse landslide warning content", { error: err, input: content, title });
    return null;
  }
}

function toUtcIso(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
