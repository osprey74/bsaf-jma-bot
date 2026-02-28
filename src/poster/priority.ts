/**
 * Priority assignment for BSAF posts based on disaster type and severity.
 *
 * Priority levels (from spec §7.4):
 *   P0 — Immediate (bypass minInterval): 大津波警報, 南海トラフ臨時情報
 *   P1 — Highest: 津波警報・注意報, 特別警報, 噴火
 *   P2 — High: 震度5以上の地震, 土砂災害警戒情報
 *   P3 — Normal: 震度3-4の地震, 気象警報, 竜巻注意, 記録的大雨
 *   P4 — Low: 震度1-2の地震, 降灰予報, その他
 */

export type Priority = 0 | 1 | 2 | 3 | 4;

/**
 * Determine posting priority from BSAF tags.
 * Lower number = higher priority.
 */
export function determinePriority(tags: string[]): Priority {
  const type = tags.find((t) => t.startsWith("type:"))?.slice(5) ?? "";
  const value = tags.find((t) => t.startsWith("value:"))?.slice(6) ?? "";

  // P0: 大津波警報, 南海トラフ臨時情報
  if (type === "nankai-trough") return 0;
  if (type === "tsunami" && value === "special-warning") return 0;

  // P1: 津波警報・注意報, 特別警報, 噴火（全種）
  // Note: spec lists only 噴火速報 as P1, but tags cannot distinguish
  // 噴火速報 from 噴火警報. Since eruptions are rare and always critical,
  // all eruption posts are treated as P1.
  if (type === "tsunami") return 1;
  if (type === "special-warning") return 1;
  if (type === "eruption") return 1;

  // P2: 震度5以上の地震, 土砂災害警戒情報
  if (type === "earthquake" && ["5-", "5+", "6-", "6+", "7"].includes(value)) return 2;
  if (type === "landslide-warning") return 2;

  // P3: 震度3-4の地震, 気象警報, 竜巻注意, 記録的大雨
  if (type === "earthquake" && ["3", "4"].includes(value)) return 3;
  if (type === "weather-warning") return 3;
  if (type === "tornado-warning") return 3;
  if (type === "heavy-rain") return 3;

  // P4: 震度1-2の地震, 降灰予報, その他
  return 4;
}
