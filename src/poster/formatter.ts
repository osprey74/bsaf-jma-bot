import type {
  EarthquakeInfo,
  TsunamiInfo,
  TsunamiAreaDetail,
  EruptionInfo,
  AshfallInfo,
  NankaiTroughInfo,
} from "../parser/types.js";
import { prefCodesToTargetRegions } from "../utils/region-map.js";
import { tsunamiAreasToTargets } from "../utils/tsunami-area-map.js";
import { volcanoToTarget } from "../utils/volcano-map.js";
import type { BsafPost } from "./bluesky.js";

// ---- Shared helpers ----

/** Emoji by BSAF value level: 🟣 最大危険 / 🔴 高 / 🟠 警報 / 🟡 注意 */
function getEmojiForValue(value: string): string {
  if (value === "special-warning") return "🟣";
  if (value === "severe-warning" || value === "warning") return "🔴";
  if (value === "advisory") return "🟠";
  return "🟡";
}

/** Format a JST ISO string to a display string like "25日18時41分" */
function formatJstTime(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDate();
  const hour = jst.getUTCHours();
  const min = jst.getUTCMinutes().toString().padStart(2, "0");
  return `${day}日${hour}時${min}分`;
}

/** BSAF value level priority (higher = more severe). */
const VALUE_PRIORITY: Record<string, number> = {
  info: 0,
  advisory: 1,
  warning: 2,
  "severe-warning": 3,
  "special-warning": 4,
};

/** Return the highest BSAF value from a list. */
function highestValue(values: string[]): string {
  let max = "info";
  for (const v of values) {
    if ((VALUE_PRIORITY[v] ?? -1) > (VALUE_PRIORITY[max] ?? -1)) max = v;
  }
  return max;
}

// ---- Earthquake ----

/**
 * Convert raw JMA intensity value to Japanese display string.
 * "5-" → "5弱", "5+" → "5強", "6-" → "6弱", "6+" → "6強", others pass through.
 */
function intensityToDisplay(raw: string): string {
  const map: Record<string, string> = {
    "5-": "5弱",
    "5+": "5強",
    "6-": "6弱",
    "6+": "6強",
  };
  return map[raw] ?? raw;
}

/** Emoji for raw JMA intensity value. */
function getEmojiForIntensity(raw: string): string {
  if (raw === "7") return "🟣";
  if (raw === "6+" || raw === "6-" || raw === "5+" || raw === "5-") return "🔴";
  if (raw === "4" || raw === "3") return "🟠";
  return "🟡";
}

export function formatEarthquakePost(info: EarthquakeInfo): BsafPost | null {
  const targets = prefCodesToTargetRegions(info.prefCodes);
  if (targets.length === 0) return null;

  const primaryTarget = targets[0];
  const emoji = getEmojiForIntensity(info.maxIntensity);
  const displayTime = formatJstTime(info.reportDateTime);

  const depthStr =
    info.depthKm > 0 ? `深さ約${info.depthKm}km` : "深さ不明";
  const tsunamiStr = info.tsunamiComment || "";

  const text = [
    `${emoji} 地震情報`,
    `${displayTime}ころ、${info.hypocenterName}で地震`,
    `マグニチュード：${info.magnitude}（${depthStr}）`,
    `最大震度：${intensityToDisplay(info.maxIntensity)}`,
    tsunamiStr,
    `（出典：気象庁）`,
  ]
    .filter(Boolean)
    .join("\n");

  const tags = [
    "bsaf:v1",
    "type:earthquake",
    `value:${info.maxIntensity}`,
    `time:${info.originTimeUtc}`,
    `target:${primaryTarget}`,
    "source:jma",
  ];

  return { text, tags, langs: ["ja"] };
}

// ---- Tsunami ----

/** Map tsunami warning kind code to BSAF value. */
function tsunamiKindToBsafValue(kindCode: string): string {
  switch (kindCode) {
    case "52":
    case "53":
      return "special-warning"; // 大津波警報
    case "51":
      return "warning"; // 津波警報
    case "62":
      return "advisory"; // 津波注意報
    case "71":
    case "72":
    case "73":
      return "info"; // 津波予報
    default:
      return "info";
  }
}

export function formatTsunamiPost(info: TsunamiInfo): BsafPost | null {
  if (info.areas.length === 0) return null;

  // Determine highest warning level
  const bsafValues = info.areas.map((a) => tsunamiKindToBsafValue(a.kindCode));
  const bsafValue = highestValue(bsafValues);

  // Determine target regions from area names
  const areaNames = info.areas.map((a) => a.name);
  const targets = tsunamiAreasToTargets(areaNames);
  if (targets.length === 0) return null;

  const emoji = getEmojiForValue(bsafValue);

  // Title: use the highest warning kind name
  const titleKind = info.areas.reduce((max, a) =>
    (VALUE_PRIORITY[tsunamiKindToBsafValue(a.kindCode)] ?? 0) >
    (VALUE_PRIORITY[tsunamiKindToBsafValue(max.kindCode)] ?? 0)
      ? a
      : max,
  ).kindName;

  // Group areas by warning kind for display
  const groups = groupAreasByKind(info.areas);
  const displayTime = formatJstTime(info.reportDateTime);

  const lines: string[] = [
    `${emoji} ${titleKind}`,
    `${displayTime}発表`,
  ];

  for (const [kindName, areas] of groups) {
    const names = areas.map((a) => a.name).join("、");
    lines.push(`${kindName}：${names}`);
  }

  // Add max expected height if available
  const maxHeight = findMaxExpectedHeight(info.areas);
  if (maxHeight) {
    lines.push(`予想される最大高さ：${maxHeight}`);
  }

  lines.push(`（出典：気象庁）`);
  const text = lines.join("\n");

  const tags = [
    "bsaf:v1",
    "type:tsunami",
    `value:${bsafValue}`,
    `time:${info.timeUtc}`,
    `target:${targets[0]}`,
    "source:jma",
  ];

  return { text, tags, langs: ["ja"] };
}

/** Group tsunami areas by their warning kind name, preserving severity order. */
function groupAreasByKind(areas: TsunamiAreaDetail[]): [string, TsunamiAreaDetail[]][] {
  const map = new Map<string, TsunamiAreaDetail[]>();
  // Sort areas by severity (highest first)
  const sorted = [...areas].sort(
    (a, b) =>
      (VALUE_PRIORITY[tsunamiKindToBsafValue(b.kindCode)] ?? 0) -
      (VALUE_PRIORITY[tsunamiKindToBsafValue(a.kindCode)] ?? 0),
  );
  for (const area of sorted) {
    const existing = map.get(area.kindName);
    if (existing) existing.push(area);
    else map.set(area.kindName, [area]);
  }
  return [...map.entries()];
}

/** Find the maximum expected height description across all areas. */
function findMaxExpectedHeight(areas: TsunamiAreaDetail[]): string {
  // Priority: 巨大 > 高い > numeric heights
  for (const a of areas) {
    if (a.expectedHeight === "巨大") return "巨大";
  }
  for (const a of areas) {
    if (a.expectedHeight === "高い") return "高い";
  }
  // Find the highest numeric value
  const heights = areas
    .map((a) => a.expectedHeight)
    .filter(Boolean);
  return heights[0] ?? "";
}

// ---- Eruption ----

/** Map eruption alert level to BSAF value. */
function eruptionLevelToBsafValue(alertLevel: number, title: string): string {
  if (alertLevel >= 4) return "special-warning";
  if (alertLevel >= 3) return "warning";
  if (alertLevel >= 2) return "advisory";
  // 噴火速報 (flash bulletin) = warning level
  if (title.includes("噴火速報")) return "warning";
  return "advisory";
}

export function formatEruptionPost(info: EruptionInfo): BsafPost | null {
  // Determine target from municipality codes (first 2 digits = prefecture code)
  const prefCodes = info.municipalityCodes
    .map((c) => c.substring(0, 2))
    .filter((c) => c.length === 2);
  let targets = prefCodesToTargetRegions(prefCodes);

  // Fallback: use volcano-to-region mapping
  if (targets.length === 0) {
    const target = volcanoToTarget(info.volcanoName);
    if (target) targets = [target];
  }
  if (targets.length === 0) return null;

  const bsafValue = eruptionLevelToBsafValue(info.alertLevel, info.title);
  const emoji = getEmojiForValue(bsafValue);
  const displayTime = formatJstTime(info.reportDateTime);

  const isFlashBulletin = info.title.includes("噴火速報");

  const lines: string[] = [];
  if (isFlashBulletin) {
    lines.push(`${emoji} 噴火速報`);
    lines.push(`${info.volcanoName}で噴火が発生`);
    lines.push(`${displayTime}発表`);
  } else {
    lines.push(`${emoji} ${info.warningKind || "噴火警報"}`);
    const levelStr =
      info.alertLevel > 0 ? `（噴火警戒レベル${info.alertLevel}）` : "";
    lines.push(`${info.volcanoName}${levelStr}`);
    lines.push(`${displayTime}発表`);
  }

  lines.push(`（出典：気象庁）`);
  const text = lines.join("\n");

  const tags = [
    "bsaf:v1",
    "type:eruption",
    `value:${bsafValue}`,
    `time:${info.timeUtc}`,
    `target:${targets[0]}`,
    "source:jma",
  ];

  return { text, tags, langs: ["ja"] };
}

// ---- Ashfall ----

/** Map ashfall forecast type to BSAF value. */
function ashfallTypeToBsafValue(forecastType: string): string {
  if (forecastType === "速報" || forecastType === "詳細") return "advisory";
  return "info"; // 定時
}

export function formatAshfallPost(info: AshfallInfo): BsafPost | null {
  const target = volcanoToTarget(info.volcanoName);
  if (!target) return null;

  const bsafValue = ashfallTypeToBsafValue(info.forecastType);
  const emoji = getEmojiForValue(bsafValue);

  // Clean and truncate the content for the post text
  let contentText = info.content
    .replace(/【.*?】\s*/, "") // Remove the header bracket part
    .trim();

  // Ensure post stays under 300 graphemes (leave room for header + attribution)
  const maxContentLen = 220;
  if ([...contentText].length > maxContentLen) {
    contentText = [...contentText].slice(0, maxContentLen).join("") + "…";
  }

  const text = [
    `${emoji} 降灰予報（${info.forecastType}）`,
    contentText,
    `（出典：気象庁）`,
  ]
    .filter(Boolean)
    .join("\n");

  const tags = [
    "bsaf:v1",
    "type:ashfall",
    `value:${bsafValue}`,
    `time:${info.timeUtc}`,
    `target:${target}`,
    "source:jma",
  ];

  return { text, tags, langs: ["ja"] };
}

// ---- Nankai Trough ----

/** Nankai Trough target regions (Pacific coast). */
const NANKAI_TARGETS = [
  "jp-chubu",
  "jp-kinki",
  "jp-shikoku",
  "jp-kyushu",
  "jp-kanto",
  "jp-okinawa",
];

/** Map Nankai Trough keyword to BSAF value. */
function nankaiKeywordToBsafValue(keyword: string): string {
  if (keyword === "巨大地震警戒") return "special-warning";
  if (keyword === "巨大地震注意") return "warning";
  if (keyword === "調査中") return "advisory";
  return "advisory";
}

export function formatNankaiTroughPost(info: NankaiTroughInfo): BsafPost | null {
  const bsafValue = nankaiKeywordToBsafValue(info.keyword);
  const emoji = getEmojiForValue(bsafValue);
  const displayTime = formatJstTime(info.reportDateTime);

  const keywordStr = info.keyword ? `（${info.keyword}）` : "";

  // Truncate body text if needed
  let bodyText = info.bodyText.trim();
  const maxBodyLen = 200;
  if ([...bodyText].length > maxBodyLen) {
    bodyText = [...bodyText].slice(0, maxBodyLen).join("") + "…";
  }

  const lines: string[] = [
    `${emoji} 南海トラフ地震臨時情報${keywordStr}`,
    `${displayTime}発表`,
  ];
  if (bodyText) lines.push(bodyText);
  lines.push(`（出典：気象庁）`);

  const text = lines.join("\n");

  const tags = [
    "bsaf:v1",
    "type:nankai-trough",
    `value:${bsafValue}`,
    `time:${info.timeUtc}`,
    `target:${NANKAI_TARGETS[0]}`,
    "source:jma",
  ];

  return { text, tags, langs: ["ja"] };
}
