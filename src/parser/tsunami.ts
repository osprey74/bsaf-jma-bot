import { XMLParser } from "fast-xml-parser";
import type { TsunamiInfo, TsunamiAreaDetail } from "./types.js";
import { logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/** Warning kind codes that represent active warnings (not cancellation). */
const ACTIVE_KIND_CODES = new Set(["51", "52", "53", "62", "71", "72", "73"]);

/**
 * Parse a JMA tsunami warning/advisory detail XML (VTSE41/VTSE51) into TsunamiInfo.
 */
export function parseTsunamiXml(xml: string): TsunamiInfo | null {
  try {
    const doc = parser.parse(xml);
    const report = doc.Report;
    if (!report) return null;

    const head = report.Head;
    const body = report.Body;
    if (!head) return null;

    const forecast = body?.Tsunami?.Forecast;
    if (!forecast) return null;

    // Extract forecast items
    const rawItems: unknown[] = Array.isArray(forecast.Item)
      ? forecast.Item
      : forecast.Item
        ? [forecast.Item]
        : [];

    const areas: TsunamiAreaDetail[] = [];
    for (const raw of rawItems) {
      const item = raw as Record<string, unknown>;
      const area = item.Area as Record<string, unknown> | undefined;
      const category = item.Category as Record<string, unknown> | undefined;
      const kind = category?.Kind as Record<string, unknown> | undefined;

      const kindCode = String(kind?.Code ?? "");

      // Skip cancellations and "no tsunami" entries
      if (!ACTIVE_KIND_CODES.has(kindCode)) continue;

      const maxHeight = item.MaxHeight as Record<string, unknown> | undefined;
      const heightNode = maxHeight?.["jmx_eb:TsunamiHeight"] as
        | Record<string, unknown>
        | undefined;

      const firstHeight = item.FirstHeight as
        | Record<string, unknown>
        | undefined;

      areas.push({
        name: String(area?.Name ?? ""),
        code: String(area?.Code ?? ""),
        kindName: String(kind?.Name ?? ""),
        kindCode,
        expectedHeight: extractHeightDescription(heightNode),
        arrivalTime: String(firstHeight?.ArrivalTime ?? ""),
      });
    }

    // Skip if no active warnings
    if (areas.length === 0) return null;

    // Event time: TargetDateTime (JST) → UTC
    const targetTimeJst = String(head.TargetDateTime ?? "");
    const timeUtc = toUtcIso(targetTimeJst);

    const info: TsunamiInfo = {
      eventId: String(head.EventID ?? ""),
      title: String(report.Control?.Title ?? head.Title ?? ""),
      timeUtc,
      reportDateTime: String(head.ReportDateTime ?? ""),
      areas,
    };

    const maxKind = areas.reduce(
      (max, a) => (kindPriority(a.kindCode) > kindPriority(max.kindCode) ? a : max),
      areas[0],
    );
    logger.info("PARSE", `tsunami: ${maxKind.kindName} — ${areas.length} areas`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse tsunami XML", { error: err, input: xml });
    return null;
  }
}

/** Extract height description from TsunamiHeight node. */
function extractHeightDescription(
  node: Record<string, unknown> | undefined,
): string {
  if (!node) return "";
  // @condition has qualitative descriptions like "巨大", "高い"
  const condition = String(node["@_condition"] ?? "");
  if (condition) return condition;
  // @description has quantitative descriptions like "３ｍ"
  return String(node["@_description"] ?? "");
}

/** Priority order for tsunami warning kind codes (higher = more severe). */
function kindPriority(code: string): number {
  switch (code) {
    case "52":
    case "53":
      return 4; // 大津波警報
    case "51":
      return 3; // 津波警報
    case "62":
      return 2; // 津波注意報
    case "71":
    case "72":
    case "73":
      return 1; // 津波予報
    default:
      return 0;
  }
}

function toUtcIso(jstIso: string): string {
  if (!jstIso) return "";
  const d = new Date(jstIso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
