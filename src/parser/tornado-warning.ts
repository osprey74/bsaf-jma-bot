import type { TornadoWarningInfo } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Parse tornado warning from a feed entry's content text (no detail XML needed).
 *
 * Content format example:
 * 【高知県竜巻注意情報】高知県は、竜巻などの激しい突風が発生しやすい気象状況になっています。
 */
export function parseTornadoWarningContent(
  content: string,
  title: string,
  updated: string,
): TornadoWarningInfo | null {
  try {
    // Extract prefecture name from content: 【{prefName}竜巻注意情報】
    // or from title: "{prefName}竜巻注意情報"
    const prefMatch =
      content.match(/【(.+?)竜巻注意情報】/) ??
      title.match(/(.+?)竜巻注意情報/);
    if (!prefMatch) {
      logger.warn("PARSE", "Could not extract prefecture from tornado warning content");
      return null;
    }

    const prefName = prefMatch[1].trim();
    const timeUtc = toUtcIso(updated);

    const info: TornadoWarningInfo = {
      title,
      timeUtc,
      content,
      prefName,
    };

    logger.info("PARSE", `tornado-warning: ${prefName}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse tornado warning content", { error: err, input: content, title });
    return null;
  }
}

function toUtcIso(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
