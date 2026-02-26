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
  /** Maximum seismic intensity (JMA scale, e.g., "5強") */
  maxIntensity: string;
  /** JMA prefecture codes where shaking was observed */
  prefCodes: string[];
  /** Tsunami comment (e.g., "この地震による津波の心配はありません。") */
  tsunamiComment: string;
  /** Report datetime from JMA (ISO 8601) */
  reportDateTime: string;
}

// ---- Step 2 types (eqvol.xml) — to be expanded when parsers are implemented ----

/** Parsed tsunami warning/advisory information. */
export interface TsunamiInfo {
  eventId: string;
  title: string;
  timeUtc: string;
  reportDateTime: string;
}

/** Parsed eruption/volcanic alert information. */
export interface EruptionInfo {
  eventId: string;
  title: string;
  timeUtc: string;
  reportDateTime: string;
}

/** Parsed ashfall forecast information. */
export interface AshfallInfo {
  title: string;
  timeUtc: string;
  content: string;
}

/** Parsed Nankai Trough temporary information. */
export interface NankaiTroughInfo {
  eventId: string;
  title: string;
  timeUtc: string;
  reportDateTime: string;
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
