import { XMLParser } from "fast-xml-parser";
import type { EruptionInfo } from "./types.js";
import { logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/**
 * Parse a JMA eruption detail XML (VFVO50/VFVO52/VFVO56) into EruptionInfo.
 */
export function parseEruptionXml(xml: string): EruptionInfo | null {
  try {
    const doc = parser.parse(xml);
    const report = doc.Report;
    if (!report) return null;

    const head = report.Head;
    const body = report.Body;
    if (!head || !body) return null;

    // Find the volcano info block (could be multiple VolcanoInfo with different @type)
    const volcanoInfos = findVolcanoInfos(body);

    // Extract volcano name and warning info from the target volcano block
    const volcanoBlock = volcanoInfos.find(
      (v) =>
        String(v["@_type"] ?? "").includes("対象火山") ||
        String(v["@_type"] ?? "").includes("火山観測報"),
    );

    let volcanoName = "";
    let volcanoCode = "";
    let alertLevel = 0;
    let warningKind = "";

    if (volcanoBlock) {
      const item = extractItem(volcanoBlock);
      const kind = item?.Kind as Record<string, unknown> | undefined;
      const areas = extractAreas(item);

      volcanoName = areas.length > 0 ? String(areas[0].Name ?? "") : "";
      volcanoCode = areas.length > 0 ? String(areas[0].Code ?? "") : "";

      // Extract warning kind and alert level from Kind/FormalName
      const formalName = String(kind?.FormalName ?? kind?.Name ?? "");
      warningKind = String(kind?.Name ?? "");
      alertLevel = extractAlertLevel(formalName);
    }

    // Extract municipality codes from the municipality block
    const municipalityBlock = volcanoInfos.find((v) =>
      String(v["@_type"] ?? "").includes("市町村"),
    );
    const municipalityCodes = extractMunicipalityCodes(municipalityBlock);

    // If no volcano name found, try headline
    if (!volcanoName) {
      const headlineText = String(head.Headline?.Text ?? "");
      const nameMatch = headlineText.match(/(?:火山名\s*)?([^\s（(]+?)(?:\s|で|に|の|が|は)/);
      if (nameMatch) volcanoName = nameMatch[1];
    }

    if (!volcanoName) return null;

    // Event time
    const targetTimeJst = String(head.TargetDateTime ?? head.ReportDateTime ?? "");
    const timeUtc = toUtcIso(targetTimeJst);

    const info: EruptionInfo = {
      eventId: String(head.EventID ?? ""),
      title: String(report.Control?.Title ?? head.Title ?? ""),
      timeUtc,
      reportDateTime: String(head.ReportDateTime ?? ""),
      volcanoName,
      volcanoCode,
      alertLevel,
      warningKind,
      municipalityCodes,
    };

    logger.info("PARSE", `eruption: ${volcanoName} level=${alertLevel} ${warningKind}`);
    return info;
  } catch (err) {
    logger.error("PARSE", "Failed to parse eruption XML", { error: err, input: xml });
    return null;
  }
}

/** Extract alert level number from FormalName like "噴火警報（火口周辺）（噴火警戒レベル３、入山規制）" */
function extractAlertLevel(formalName: string): number {
  const match = formalName.match(/噴火警戒レベル(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** Find all VolcanoInfo blocks in the body. */
function findVolcanoInfos(body: Record<string, unknown>): Record<string, unknown>[] {
  const vi = body.VolcanoInfo;
  if (!vi) return [];
  return Array.isArray(vi) ? vi : [vi as Record<string, unknown>];
}

/** Extract the first Item from a VolcanoInfo block. */
function extractItem(volcanoInfo: Record<string, unknown>): Record<string, unknown> | undefined {
  const items = volcanoInfo.Item;
  if (!items) return undefined;
  const arr: unknown[] = Array.isArray(items) ? items : [items];
  return arr[0] as Record<string, unknown> | undefined;
}

/** Extract Area entries from an Item. */
function extractAreas(item: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!item) return [];
  const areas = item.Areas as Record<string, unknown> | undefined;
  if (!areas) return [];
  const areaList = areas.Area;
  if (!areaList) return [];
  return Array.isArray(areaList) ? areaList : [areaList as Record<string, unknown>];
}

/** Extract municipality codes from the municipality VolcanoInfo block. */
function extractMunicipalityCodes(block: Record<string, unknown> | undefined): string[] {
  if (!block) return [];
  const codes: string[] = [];
  const items = block.Item;
  const itemArr: unknown[] = Array.isArray(items) ? items : items ? [items] : [];

  for (const raw of itemArr) {
    const item = raw as Record<string, unknown>;
    const areas = extractAreas(item);
    for (const area of areas) {
      const code = String(area.Code ?? "");
      if (code) codes.push(code);
    }
  }
  return codes;
}

function toUtcIso(jstIso: string): string {
  if (!jstIso) return "";
  const d = new Date(jstIso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
