import path from "node:path";

export const config = {
  bluesky: {
    service: process.env.BLUESKY_SERVICE || "https://bsky.social",
    identifier: process.env.BLUESKY_IDENTIFIER || "",
    appPassword: process.env.BLUESKY_APP_PASSWORD || "",
  },
  jma: {
    eqvolFeedUrl:
      "https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml",
    extraFeedUrl:
      "https://www.data.jma.go.jp/developer/xml/feed/extra.xml",
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 45_000,
  },
  dataDir: process.env.DATA_DIR || "./data",
  get sessionPath() {
    return path.join(this.dataDir, "session.json");
  },
  get dbPath() {
    return path.join(this.dataDir, "dedup.db");
  },
  posting: {
    minIntervalMs: 10_000,
  },
} as const;
