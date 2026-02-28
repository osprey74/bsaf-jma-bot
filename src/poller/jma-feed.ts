import { XMLParser } from "fast-xml-parser";
import type { DisasterType } from "../parser/types.js";
import { logger } from "../utils/logger.js";

export interface FeedEntry {
  id: string;
  title: string;
  updated: string;
  linkHref: string;
  content: string;
  /** Classified disaster type based on title matching. */
  disasterType: DisasterType;
  /** Whether detail XML must be fetched for proper parsing. */
  needsDetailXml: boolean;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

/**
 * Title-to-type mapping rules. Patterns are tested in order; first match wins.
 * More specific patterns must precede general ones.
 * Uses regex for forward-compatibility with 2026 JMA telegram format changes.
 */
const TITLE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  type: DisasterType;
  needsDetailXml: boolean;
}> = [
  // -- Earthquake (eqvol.xml) --
  { pattern: /震度速報/, type: "earthquake", needsDetailXml: true },
  { pattern: /震源・震度に関する情報/, type: "earthquake", needsDetailXml: true },
  { pattern: /震源に関する情報/, type: "earthquake", needsDetailXml: true },

  // -- Tsunami (eqvol.xml) --
  { pattern: /大津波警報|津波警報|津波注意報|津波予報/, type: "tsunami", needsDetailXml: true },
  { pattern: /津波情報/, type: "tsunami", needsDetailXml: true },

  // -- Eruption (eqvol.xml) --
  { pattern: /噴火速報/, type: "eruption", needsDetailXml: true },
  { pattern: /噴火警報|噴火予報/, type: "eruption", needsDetailXml: true },

  // -- Ashfall (eqvol.xml) --
  { pattern: /降灰予報/, type: "ashfall", needsDetailXml: false },

  // -- Nankai Trough (eqvol.xml) --
  { pattern: /南海トラフ/, type: "nankai-trough", needsDetailXml: true },

  // -- Landslide (extra.xml) -- must precede general weather patterns
  { pattern: /土砂災害警戒情報/, type: "landslide-warning", needsDetailXml: false },

  // -- Tornado (extra.xml) --
  { pattern: /竜巻注意情報/, type: "tornado-warning", needsDetailXml: false },

  // -- Record Heavy Rain (extra.xml) --
  { pattern: /記録的短時間大雨情報/, type: "heavy-rain", needsDetailXml: false },

  // -- Weather (extra.xml) --
  // "気象特別警報・警報・注意報" is a combined telegram covering all severity levels.
  // The actual severity (special-warning vs warning vs advisory) is determined by the parser.
  { pattern: /気象特別警報・警報・注意報/, type: "weather-warning", needsDetailXml: true },
  { pattern: /特別警報/, type: "special-warning", needsDetailXml: true },
  { pattern: /気象警報|気象.*注意報/, type: "weather-warning", needsDetailXml: false },
];

/** Match a feed entry title to a disaster type. Returns null if no match. */
function matchTitle(
  title: string
): { type: DisasterType; needsDetailXml: boolean } | null {
  for (const rule of TITLE_PATTERNS) {
    if (rule.pattern.test(title)) {
      return { type: rule.type, needsDetailXml: rule.needsDetailXml };
    }
  }
  return null;
}

/**
 * Fetch a JMA Atom feed and return entries matching known disaster types.
 * @param feedUrl  URL of the JMA Atom feed (eqvol.xml or extra.xml)
 * @param feedName Short name for logging (e.g., "eqvol", "extra")
 */
export async function fetchFeedEntries(
  feedUrl: string,
  feedName: string
): Promise<FeedEntry[]> {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`JMA feed fetch failed (${feedName}): ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const feed = parsed.feed;
  if (!feed?.entry) return [];

  const entries: unknown[] = Array.isArray(feed.entry)
    ? feed.entry
    : [feed.entry];

  const result: FeedEntry[] = [];
  for (const e of entries) {
    const entry = e as Record<string, unknown>;
    const title = String(entry.title ?? "");
    const match = matchTitle(title);
    if (!match) continue;

    const link = entry.link as Record<string, string> | undefined;

    // content may be a plain string or an object { @_type, #text } from fast-xml-parser
    const rawContent = entry.content;
    const contentText =
      typeof rawContent === "string"
        ? rawContent
        : typeof rawContent === "object" && rawContent !== null
          ? String((rawContent as Record<string, unknown>)["#text"] ?? "")
          : "";

    result.push({
      id: String(entry.id ?? ""),
      title,
      updated: String(entry.updated ?? ""),
      linkHref: link?.["@_href"] ?? "",
      content: contentText,
      disasterType: match.type,
      needsDetailXml: match.needsDetailXml,
    });
  }

  // Log summary by type
  const typeCounts = new Map<string, number>();
  for (const e of result) {
    typeCounts.set(e.disasterType, (typeCounts.get(e.disasterType) ?? 0) + 1);
  }
  const summary = [...typeCounts.entries()]
    .map(([t, c]) => `${c} ${t}`)
    .join(", ");
  logger.info(
    "POLL",
    `${feedName}: ${result.length} entries (${summary || "none"})`
  );

  return result;
}
