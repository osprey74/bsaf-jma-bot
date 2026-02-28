/** Disaster type identifier matching BSAF type: tag values. */
export type DisasterType =
  | "earthquake"
  | "tsunami"
  | "eruption"
  | "ashfall"
  | "nankai-trough"
  | "special-warning"
  | "weather-warning"
  | "landslide-warning"
  | "tornado-warning"
  | "heavy-rain";

/** Parsed earthquake information from JMA detail XML. */
export interface EarthquakeInfo {
  /** JMA event ID (e.g., "20260225184145") */
  eventId: string;
  /** Title from JMA (e.g., "震源・震度に関する情報") */
  title: string;
  /** Source event time in ISO 8601 UTC (for BSAF time: tag) */
  originTimeUtc: string;
  /** Hypocenter area name (e.g., "青森県東方沖") */
  hypocenterName: string;
  /** Magnitude (e.g., 4.3) */
  magnitude: number;
  /** Depth in km (e.g., 60) */
  depthKm: number;
  /** Maximum seismic intensity — raw JMA value (e.g., "5+", "6-", "7") */
  maxIntensity: string;
  /** JMA prefecture codes where shaking was observed */
  prefCodes: string[];
  /** Tsunami comment (e.g., "この地震による津波の心配はありません。") */
  tsunamiComment: string;
  /** Report datetime from JMA (ISO 8601) */
  reportDateTime: string;
}

// ---- Step 2 types (eqvol.xml) ----

/** Per-area detail within a tsunami forecast. */
export interface TsunamiAreaDetail {
  /** Forecast area name (e.g., "岩手県", "千葉県九十九里・外房") */
  name: string;
  /** Forecast area code */
  code: string;
  /** Warning kind name (e.g., "大津波警報", "津波警報", "津波注意報") */
  kindName: string;
  /** Warning kind code (e.g., "52", "51", "62") */
  kindCode: string;
  /** Expected height description (e.g., "３ｍ", "巨大") or empty */
  expectedHeight: string;
  /** First arrival time (ISO 8601) or empty */
  arrivalTime: string;
}

/** Parsed tsunami warning/advisory information from VTSE41/51. */
export interface TsunamiInfo {
  eventId: string;
  title: string;
  /** Event timestamp in ISO 8601 UTC */
  timeUtc: string;
  reportDateTime: string;
  /** Per-area forecast details (only active warnings, excludes 解除/津波なし) */
  areas: TsunamiAreaDetail[];
}

/** Parsed eruption/volcanic alert information from VFVO50/52/56. */
export interface EruptionInfo {
  eventId: string;
  title: string;
  timeUtc: string;
  reportDateTime: string;
  /** Volcano name (e.g., "桜島") */
  volcanoName: string;
  /** JMA volcano code */
  volcanoCode: string;
  /** Volcanic alert level (1-5), 0 if not available */
  alertLevel: number;
  /** Warning kind name (e.g., "噴火警報（火口周辺）") */
  warningKind: string;
  /** Municipality codes (6-digit) for target region mapping */
  municipalityCodes: string[];
}

/** Parsed ashfall forecast information from feed entry content. */
export interface AshfallInfo {
  title: string;
  /** Entry updated timestamp in ISO 8601 UTC */
  timeUtc: string;
  /** Raw content from feed entry */
  content: string;
  /** Extracted volcano name (e.g., "桜島") */
  volcanoName: string;
  /** Forecast type: "定時" | "速報" | "詳細" */
  forecastType: string;
}

/** Parsed Nankai Trough temporary information from VYSE50/51. */
export interface NankaiTroughInfo {
  eventId: string;
  title: string;
  timeUtc: string;
  reportDateTime: string;
  /** Keyword: "巨大地震警戒" | "巨大地震注意" | "調査中" or raw headline */
  keyword: string;
  /** Main body text */
  bodyText: string;
}

// ---- Step 3 types (extra.xml) — to be expanded when parsers are implemented ----

/** Parsed special warning information. */
export interface SpecialWarningInfo {
  title: string;
  timeUtc: string;
  reportDateTime: string;
}

/** Parsed weather warning/advisory information. */
export interface WeatherWarningInfo {
  title: string;
  timeUtc: string;
  content: string;
}

/** Parsed landslide warning information. */
export interface LandslideWarningInfo {
  title: string;
  timeUtc: string;
  content: string;
}

/** Parsed tornado warning information. */
export interface TornadoWarningInfo {
  title: string;
  timeUtc: string;
  content: string;
}

/** Parsed record heavy rain information. */
export interface HeavyRainInfo {
  title: string;
  timeUtc: string;
  content: string;
}

/** Union of all disaster info types. */
export type DisasterInfo =
  | EarthquakeInfo
  | TsunamiInfo
  | EruptionInfo
  | AshfallInfo
  | NankaiTroughInfo
  | SpecialWarningInfo
  | WeatherWarningInfo
  | LandslideWarningInfo
  | TornadoWarningInfo
  | HeavyRainInfo;
