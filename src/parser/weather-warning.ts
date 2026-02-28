import { XMLParser } from "fast-xml-parser";
import type { WeatherWarningInfo } from "./types.js";
import { logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/**
 * JMA warning code ranges:
 * - 32-38: Special warning (特別警報)
 * - 02-08: Warning (警報)
 * - 10-27: Advisory (注意報)
 */
function codeToLevel(code: string): "special-warning" | "warning" | "advisory" | null {
  const n = parseInt(code, 10);
  if (isNaN(n)) return null;
  if (n >= 32 && n <= 38) return "special-warning";
  if (n >= 2 && n <= 8) return "warning";
  if (n >= 10 && n <= 27) return "advisory";
  return null;
}

const LEVEL_PRIORITY: Record<string, number> = {
  advisory: 0,
  warning: 1,
  "special-warning": 2,
};

/** Active statuses — exclude 解除 (cancellation). */
const ACTIVE_STATUSES = new Set(["発表", "継続"]);

/**
 * Parse a JMA weather warning detail XML (VPWW53/54) into WeatherWarningInfo.
 * Used for the combined "気象特別警報・警報・注意報" telegram.
 * Returns null if no active warnings at 警報 level or above.
 */
export function parseWeatherWarningXml(xml: string): WeatherWarningInfo | null {
  try {
    const doc = parser.parse(xml);
    const report = doc.Report;
    if (!report) return null;

    const head = report.Head;
    const body = report.Body;
    if (!head || !body) return null;

    const reportDateTime = toUtcIso(String(head.ReportDateTime ?? ""));
    const title = extractText(head.Title);
    const headline = extractText(head.Headline?.Text);

    const warnings = toArray(body.Warning);
    const prefCodeSet = new Set<string>();
    const warningKindNames = new Set<string>();
    let highestLevel: "special-warning" | "warning" | "advisory" = "advisory";

    for (const warning of warnings) {
      const items = toArray(warning.Item);
      for (const item of items) {
        const kinds = toArray(item.Kind);
        for (const kind of kinds) {
          const code = extractText(kind.Code);
          const status = extractText(kind.Status);
          const name = extractText(kind.Name);

          if (!ACTIVE_STATUSES.has(status)) continue;

          const level = codeToLevel(code);
          if (!level) continue;

          // Track warning-level and above
          if (level !== "advisory") {
            warningKindNames.add(name);

            const areaCode = extractText(item.Area?.Code);
            if (areaCode.length >= 2) {
              prefCodeSet.add(areaCode.substring(0, 2));
            }
          }

          if ((LEVEL_PRIORITY[level] ?? 0) > (LEVEL_PRIORITY[highestLevel] ?? 0)) {
            highestLevel = level;
          }
        }
      }
    }

    // Skip if only advisories — posting threshold is 警報以上
    if (highestLevel === "advisory") {
      logger.info("PARSE", "Weather warning XML contains only advisories, skipping");
      return null;
    }

    if (warningKindNames.size === 0) {
      logger.info("PARSE", "No active weather warnings found in XML");
      return null;
    }

    const info: WeatherWarningInfo = {
      title,
      timeUtc: reportDateTime,
      content: headline,
      highestLevel,
      warningKinds: [...warningKindNames],
      prefCodes: [...prefCodeSet],
      prefName: "",
    };

    logger.info("PARSE", `weather-warning (XML): ${highestLevel}, ${[...warningKindNames].join(", ")}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse weather warning XML", { error: err });
    return null;
  }
}

/**
 * Parse weather warning from a feed entry's content text (no detail XML needed).
 * Used for "気象警報" / "気象.*注意報" title patterns.
 *
 * Content format example:
 * 【高知県気象警報・注意報】東部では、１日昼前まで強風や高波に注意してください。
 *
 * Returns null if content indicates advisories only (no 警報 keyword).
 */
export function parseWeatherWarningContent(
  content: string,
  title: string,
  updated: string,
): WeatherWarningInfo | null {
  try {
    // Extract prefecture name from content or title
    const prefMatch =
      content.match(/【(.+?)気象警報/) ??
      content.match(/【(.+?)気象.*注意報/) ??
      title.match(/(.+?)気象警報/) ??
      title.match(/(.+?)気象.*注意報/);

    if (!prefMatch) {
      logger.warn("PARSE", "Could not extract prefecture from weather warning content");
      return null;
    }

    const prefName = prefMatch[1].trim();

    // Determine highest level from text keywords
    // Skip if only advisories (注意報 without 警報)
    const hasSpecialWarning = /特別警報/.test(content) || /特別警報/.test(title);
    const hasWarning = /[^特別]警報/.test(content) || /[^特別]警報/.test(title) ||
      /^警報/.test(content);

    let highestLevel: "special-warning" | "warning" | "advisory";
    if (hasSpecialWarning) {
      highestLevel = "special-warning";
    } else if (hasWarning) {
      highestLevel = "warning";
    } else {
      // Only advisories — skip per posting threshold
      logger.info("PARSE", `Weather warning content for ${prefName} contains only advisories, skipping`);
      return null;
    }

    const timeUtc = toUtcIso(updated);

    const info: WeatherWarningInfo = {
      title,
      timeUtc,
      content,
      highestLevel,
      warningKinds: [],
      prefCodes: [],
      prefName,
    };

    logger.info("PARSE", `weather-warning (content): ${prefName}, ${highestLevel}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse weather warning content", { error: err, input: content, title });
    return null;
  }
}

function extractText(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object" && val !== null) {
    return String((val as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

function toUtcIso(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
