import { XMLParser } from "fast-xml-parser";
import type { SpecialWarningInfo } from "./types.js";
import { logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/** JMA warning codes for special warnings (特別警報): 32-38. */
const SPECIAL_WARNING_CODES = new Set(["32", "33", "35", "36", "37", "38"]);

/** Active statuses — exclude 解除 (cancellation). */
const ACTIVE_STATUSES = new Set(["発表", "継続"]);

/**
 * Parse a JMA weather special warning detail XML (VPWW53/54) into SpecialWarningInfo.
 * Extracts only special-warning-level items (Kind.Code 32-38).
 * Returns null if no active special warnings are found.
 */
export function parseSpecialWarningXml(xml: string): SpecialWarningInfo | null {
  try {
    const doc = parser.parse(xml);
    const report = doc.Report;
    if (!report) return null;

    const head = report.Head;
    const body = report.Body;
    if (!head || !body) return null;

    const reportDateTime = toUtcIso(String(head.ReportDateTime ?? ""));
    const title = extractText(head.Title);

    // Body.Warning can be a single object or array
    const warnings = toArray(body.Warning);
    const prefCodeSet = new Set<string>();
    const kindNameSet = new Set<string>();

    for (const warning of warnings) {
      const items = toArray(warning.Item);
      for (const item of items) {
        const kinds = toArray(item.Kind);
        for (const kind of kinds) {
          const code = extractText(kind.Code);
          const status = extractText(kind.Status);
          const name = extractText(kind.Name);

          if (!SPECIAL_WARNING_CODES.has(code)) continue;
          if (!ACTIVE_STATUSES.has(status)) continue;

          kindNameSet.add(name);

          // Extract prefecture code from area code (first 2 digits)
          const areaCode = extractText(item.Area?.Code);
          if (areaCode.length >= 2) {
            prefCodeSet.add(areaCode.substring(0, 2));
          }
        }
      }
    }

    if (kindNameSet.size === 0) {
      logger.info("PARSE", "No active special warnings found in XML");
      return null;
    }

    const info: SpecialWarningInfo = {
      title,
      timeUtc: reportDateTime,
      reportDateTime,
      warningKinds: [...kindNameSet],
      prefCodes: [...prefCodeSet],
    };

    logger.info("PARSE", `special-warning: ${[...kindNameSet].join(", ")} (${prefCodeSet.size} prefs)`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse special warning XML", { error: err });
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
