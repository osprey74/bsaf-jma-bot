# bsaf-jma-bot

**A [BSAF](https://github.com/osprey74/bsaf-protocol)-compliant Bluesky bot that posts disaster alerts from the Japan Meteorological Agency (JMA).**

[@jma-alert-bot.bsky.social](https://bsky.app/profile/jma-alert-bot.bsky.social)

---

## Overview

bsaf-jma-bot monitors JMA's public XML feeds and automatically posts disaster information to Bluesky with structured BSAF tags. BSAF-compatible clients can filter posts by disaster type, severity, and region.

This is the reference bot implementation for the [BSAF protocol](https://github.com/osprey74/bsaf-protocol).

## Supported Disaster Types

| Type | Source Feed | Data Source |
|:-----|:-----------|:-----------|
| Earthquake | eqvol.xml | Detail XML |
| Tsunami | eqvol.xml | Detail XML |
| Volcanic Eruption | eqvol.xml | Detail XML |
| Ashfall Forecast | eqvol.xml | Entry content |
| Nankai Trough Advisory | eqvol.xml | Detail XML |
| Special Weather Warning | extra.xml | Detail XML |
| Weather Warning | extra.xml | Detail XML / Entry content |
| Landslide Warning | extra.xml | Entry content |
| Tornado Warning | extra.xml | Entry content |
| Record Heavy Rain | extra.xml | Entry content |

## Priority System

Posts are sorted by priority before posting. P0 events bypass the minimum posting interval for immediate delivery.

| Priority | Events |
|:---------|:-------|
| **P0** | Major tsunami warning, Nankai Trough advisory |
| **P1** | Tsunami warning/advisory, special warning, volcanic eruption |
| **P2** | Earthquake intensity 5+, landslide warning |
| **P3** | Earthquake intensity 3-4, weather warning, tornado, record heavy rain |
| **P4** | Earthquake intensity 1-2, ashfall forecast |

## Status Dashboard

- [Dashboard](https://osprey74.github.io/bsaf-jma-bot/status/) — Live bot status page
- [Health Check](https://bsaf-jma-bot.fly.dev/health) — Simple OK/error endpoint
- [Status API](https://bsaf-jma-bot.fly.dev/status) — Full JSON status snapshot

## Architecture

```
JMA XML Feeds (eqvol.xml, extra.xml)
  │  polling every 45s
  ▼
Poller → Dispatcher → Parser → Formatter → Priority Sort → Bluesky API
                                                │
                                          DedupStore (SQLite)
                                          StatusStore (in-memory)
                                                │
                                      /health, /status (HTTP :8080)
                                                │
                                      GitHub Pages Dashboard
```

## Tech Stack

- **Runtime:** Node.js 24+
- **Language:** TypeScript
- **Bluesky SDK:** @atproto/api
- **XML Parser:** fast-xml-parser
- **Storage:** better-sqlite3 (dedup)
- **Deploy:** Docker / Fly.io (Tokyo `nrt` region)

## Setup

### Prerequisites

- Node.js 24+
- A Bluesky account with an [App Password](https://bsky.app/settings/app-passwords)

### Installation

```bash
git clone https://github.com/osprey74/bsaf-jma-bot.git
cd bsaf-jma-bot
npm install
```

### Configuration

Create a `.env` file:

```
BLUESKY_IDENTIFIER=your-bot.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Optional environment variables:

| Variable | Default | Description |
|:---------|:--------|:-----------|
| `BLUESKY_SERVICE` | `https://bsky.social` | Bluesky PDS URL |
| `POLL_INTERVAL_MS` | `45000` | Feed polling interval (ms) |
| `DATA_DIR` | `./data` | Data directory for SQLite DB and session |
| `LOG_LEVEL` | `INFO` | Log level (`DEBUG`, `INFO`, `WARN`, `ERROR`) |
| `STATUS_PORT` | `8080` | HTTP port for health/status endpoints |

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Dry run (no posting, prints formatted output)
npx tsx src/dry-run.ts
```

### Deploy to Fly.io

```bash
npm run build
fly deploy
fly secrets set BLUESKY_IDENTIFIER=your-bot.bsky.social BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

## BSAF Tags

Every post includes 6 required BSAF tags:

```
bsaf:v1, type:earthquake, value:5+, time:2026-02-15T02:52:00Z, target:jp-kanto, source:jma
```

See [bot-definition.json](bot-definition.json) for all available filter options.

## Data Source

All data is sourced from [JMA's public XML feed service](https://xml.kishou.go.jp/xmlpull.html). This bot is unofficial and not affiliated with or endorsed by JMA.

## Related Projects

- [BSAF Protocol](https://github.com/osprey74/bsaf-protocol) — The protocol specification
- [kazahana](https://github.com/osprey74/kazahana) — Bluesky desktop client with BSAF support

## Support

If you find this project useful, consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)

## License

[MIT License](LICENSE)
