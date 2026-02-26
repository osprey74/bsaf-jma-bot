import { XMLParser } from "fast-xml-parser";
import type { EarthquakeInfo } from "./types.js";
import { logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Preserve text content with attributes
  textNodeName: "#text",
});

/**
 * Parse a JMA earthquake detail XML (VXSE53 etc.) into structured EarthquakeInfo.
 */
export function parseEarthquakeXml(xml: string): EarthquakeInfo | null {
  try {
    const doc = parser.parse(xml);
    const report = doc.Report;
    if (!report) return null;

    const head = report.Head;
    const body = report.Body;
    const earthquake = body?.Earthquake;

    if (!head || !earthquake) return null;

    // Event time: OriginTime is JST, convert to UTC ISO string
    const originTimeJst = String(earthquake.OriginTime ?? "");
    const originTimeUtc = toUtcIso(originTimeJst);

    // Hypocenter
    const area = earthquake.Hypocenter?.Area;
    const hypocenterName = String(area?.Name ?? "不明");

    // Depth from coordinate string: "+41.5+142.0-60000/"
    const coordStr = extractText(area?.["jmx_eb:Coordinate"]);
    const depthKm = parseDepthFromCoord(coordStr);

    // Magnitude
    const magNode = earthquake["jmx_eb:Magnitude"];
    const magnitude = Number(extractText(magNode)) || 0;

    // Max intensity
    const intensity = body.Intensity?.Observation;
    const maxIntRaw = String(intensity?.MaxInt ?? "");
    const maxIntensity = normalizeIntensity(maxIntRaw);

    // Prefecture codes
    const prefCodes = extractPrefCodes(intensity);

    // Tsunami comment
    const tsunamiComment = String(
      body.Comments?.ForecastComment?.Text ?? ""
    );

    const info: EarthquakeInfo = {
      eventId: String(head.EventID ?? ""),
      title: String(report.Control?.Title ?? head.Title ?? ""),
      originTimeUtc,
      hypocenterName,
      magnitude,
      depthKm,
      maxIntensity,
      prefCodes,
      tsunamiComment,
      reportDateTime: String(head.ReportDateTime ?? ""),
    };

    logger.info(
      "PARSE",
      `earthquake: M${magnitude} ${maxIntensity} ${hypocenterName}`
    );
    return info;
  } catch (err) {
    logger.error(
      "PARSE",
      `Failed to parse earthquake XML: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

/** Extract text content from a node that may be an object with #text or a simple string. */
function extractText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)["#text"]);
  }
  return String(node);
}

/** Parse depth from JMA coordinate string like "+41.5+142.0-60000/" → 60 km */
function parseDepthFromCoord(coord: string): number {
  // Format: +lat+lon-depthMeters/ or +lat+lon+depthMeters/
  const match = coord.match(/[+-]\d+\.?\d*[+-]\d+\.?\d*([+-]\d+)\//);
  if (!match) return 0;
  const depthMeters = Math.abs(Number(match[1]));
  return Math.round(depthMeters / 1000);
}

/** Convert JST ISO string to UTC ISO string. */
function toUtcIso(jstIso: string): string {
  if (!jstIso) return "";
  const d = new Date(jstIso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Normalize JMA intensity value.
 * MaxInt from XML is like "1","2","3","4","5-","5+","6-","6+","7"
 * We convert to: "震度1","震度2",..."震度5弱","震度5強",..."震度7"
 */
function normalizeIntensity(raw: string): string {
  const map: Record<string, string> = {
    "1": "震度1",
    "2": "震度2",
    "3": "震度3",
    "4": "震度4",
    "5-": "震度5弱",
    "5+": "震度5強",
    "6-": "震度6弱",
    "6+": "震度6強",
    "7": "震度7",
  };
  return map[raw] ?? `震度${raw}`;
}

/** Extract all prefecture codes from the Intensity/Observation node. */
function extractPrefCodes(observation: unknown): string[] {
  if (!observation || typeof observation !== "object") return [];
  const obs = observation as Record<string, unknown>;
  const prefs = obs.Pref;
  if (!prefs) return [];

  const prefArray: unknown[] = Array.isArray(prefs) ? prefs : [prefs];
  const codes: string[] = [];
  for (const p of prefArray) {
    const pref = p as Record<string, unknown>;
    const code = String(pref.Code ?? "").padStart(2, "0");
    if (code && code !== "00") codes.push(code);
  }
  return codes;
}
