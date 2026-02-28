import type { HeavyRainInfo } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Parse record short-time heavy rain info from a feed entry's content text.
 *
 * Content format examples:
 * 【記録的短時間大雨情報】１８時沖縄県で記録的短時間大雨 国頭村西部付近で約１１０ミリ
 * 【石川県記録的短時間大雨情報】９時５０分石川県で記録的短時間大雨 珠洲市付近で約１００ミリ
 */
export function parseHeavyRainContent(
  content: string,
  title: string,
  updated: string,
): HeavyRainInfo | null {
  try {
    // Try multiple extraction patterns:
    // 1. 【{prefName}記録的短時間大雨情報】
    // 2. 【記録的短時間大雨情報】...{prefName}で記録的短時間大雨
    // 3. Title: "{prefName}記録的短時間大雨情報"
    let prefName = "";

    const bracketMatch = content.match(/【(.+?)記録的短時間大雨情報】/);
    if (bracketMatch && bracketMatch[1] !== "") {
      prefName = bracketMatch[1].trim();
    }

    if (!prefName) {
      const inlineMatch = content.match(
        /(\p{Script=Han}{2,4}[都道府県])で記録的短時間大雨/u,
      );
      if (inlineMatch) {
        prefName = inlineMatch[1];
      }
    }

    if (!prefName) {
      const titleMatch = title.match(/(.+?)記録的短時間大雨情報/);
      if (titleMatch) {
        prefName = titleMatch[1].trim();
      }
    }

    if (!prefName) {
      logger.warn("PARSE", "Could not extract prefecture from heavy rain content");
      return null;
    }

    const timeUtc = toUtcIso(updated);

    const info: HeavyRainInfo = {
      title,
      timeUtc,
      content,
      prefName,
    };

    logger.info("PARSE", `heavy-rain: ${prefName}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse heavy rain content", { error: err, input: content, title });
    return null;
  }
}

function toUtcIso(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
