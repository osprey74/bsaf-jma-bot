import type { AshfallInfo } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Parse ashfall forecast from a feed entry's content text (no detail XML needed).
 *
 * Content format example:
 * 【火山名　桜島　降灰予報（定時）】　現在、桜島は噴火警戒レベル３（入山規制）です。...
 */
export function parseAshfallContent(
  content: string,
  title: string,
  updated: string,
): AshfallInfo | null {
  try {
    // Extract volcano name from content: 【火山名　{name}　降灰予報（{type}）】
    let volcanoName = "";
    const nameMatch = content.match(/火山名\s+(.+?)\s+降灰予報/);
    if (nameMatch) {
      volcanoName = nameMatch[1];
    }

    if (!volcanoName) {
      logger.warn("PARSE", `Could not extract volcano name from ashfall content`);
      return null;
    }

    // Extract forecast type from the header bracket: 降灰予報（定時）/ 降灰予報（速報）/ 降灰予報（詳細）
    let forecastType = "定時";
    const typeMatch = content.match(/降灰予報（(定時|速報|詳細)）/) ?? title.match(/降灰予報（(定時|速報|詳細)）/);
    if (typeMatch) forecastType = typeMatch[1];

    // Convert updated timestamp to UTC
    const timeUtc = toUtcIso(updated);

    const info: AshfallInfo = {
      title,
      timeUtc,
      content,
      volcanoName,
      forecastType,
    };

    logger.info("PARSE", `ashfall: ${volcanoName} (${forecastType})`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse ashfall content", { error: err, input: content, title });
    return null;
  }
}

function toUtcIso(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
