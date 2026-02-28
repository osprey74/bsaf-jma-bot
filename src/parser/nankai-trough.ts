import { XMLParser } from "fast-xml-parser";
import type { NankaiTroughInfo } from "./types.js";
import { logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/**
 * Parse a JMA Nankai Trough temporary information XML (VYSE50/51/52).
 */
export function parseNankaiTroughXml(xml: string): NankaiTroughInfo | null {
  try {
    const doc = parser.parse(xml);
    const report = doc.Report;
    if (!report) return null;

    const head = report.Head;
    const body = report.Body;
    if (!head) return null;

    // Extract keyword from headline: "南海トラフ地震臨時情報（巨大地震警戒）"
    const headlineText = String(head.Headline?.Text ?? "");
    const keyword = extractKeyword(headlineText);

    // Extract body text
    const eqInfo = body?.EarthquakeInfo;
    const bodyText = String(eqInfo?.Text ?? body?.Text ?? "");

    // Event time
    const targetTimeJst = String(head.TargetDateTime ?? head.ReportDateTime ?? "");
    const timeUtc = toUtcIso(targetTimeJst);

    const info: NankaiTroughInfo = {
      eventId: String(head.EventID ?? ""),
      title: String(report.Control?.Title ?? head.Title ?? ""),
      timeUtc,
      reportDateTime: String(head.ReportDateTime ?? ""),
      keyword,
      bodyText,
    };

    logger.info("PARSE", `nankai-trough: ${keyword || "(no keyword)"}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse nankai-trough XML", { error: err, input: xml });
    return null;
  }
}

/** Extract keyword from headline text like "南海トラフ地震臨時情報（巨大地震警戒）" */
function extractKeyword(headline: string): string {
  const match = headline.match(/南海トラフ地震臨時情報（(.+?)）/);
  if (match) return match[1];

  // Fallback: check for known keywords anywhere in text
  if (headline.includes("巨大地震警戒")) return "巨大地震警戒";
  if (headline.includes("巨大地震注意")) return "巨大地震注意";
  if (headline.includes("調査中")) return "調査中";

  return "";
}

function toUtcIso(jstIso: string): string {
  if (!jstIso) return "";
  const d = new Date(jstIso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
