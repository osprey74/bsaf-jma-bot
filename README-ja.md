# bsaf-jma-bot

**気象庁の防災情報をBlueskyに自動投稿する [BSAF](https://github.com/osprey74/bsaf-protocol) 対応Botです。**

[@jma-alert-bot.bsky.social](https://bsky.app/profile/jma-alert-bot.bsky.social)

---

## 概要

bsaf-jma-bot は気象庁の公開XMLフィードを監視し、防災情報をBSAFタグ付きでBlueskyに自動投稿します。BSAF対応クライアントでは、災害種別・重要度・地域によるフィルタリングが可能です。

[BSAFプロトコル](https://github.com/osprey74/bsaf-protocol)のリファレンスBot実装です。

## 対応災害種別

| 種別 | ソースフィード | データソース |
|:-----|:-------------|:-----------|
| 地震 | eqvol.xml | 詳細XML |
| 津波 | eqvol.xml | 詳細XML |
| 噴火 | eqvol.xml | 詳細XML |
| 降灰予報 | eqvol.xml | エントリ本文 |
| 南海トラフ臨時情報 | eqvol.xml | 詳細XML |
| 気象特別警報 | extra.xml | 詳細XML |
| 気象警報 | extra.xml | 詳細XML / エントリ本文 |
| 土砂災害警戒情報 | extra.xml | エントリ本文 |
| 竜巻注意情報 | extra.xml | エントリ本文 |
| 記録的短時間大雨情報 | extra.xml | エントリ本文 |

## 優先度システム

投稿は優先度順にソートされます。P0イベントは最小投稿間隔をバイパスし即時配信されます。

| 優先度 | 対象 |
|:-------|:-----|
| **P0** | 大津波警報、南海トラフ臨時情報 |
| **P1** | 津波警報・注意報、特別警報、噴火 |
| **P2** | 震度5以上、土砂災害警戒情報 |
| **P3** | 震度3-4、気象警報、竜巻注意情報、記録的大雨 |
| **P4** | 震度1-2、降灰予報 |

## ステータスダッシュボード

- [ダッシュボード](https://osprey74.github.io/bsaf-jma-bot/status/) — Bot稼働状況ページ
- [ヘルスチェック](https://bsaf-jma-bot.fly.dev/health) — 正常/異常の簡易エンドポイント
- [ステータスAPI](https://bsaf-jma-bot.fly.dev/status) — 詳細JSONスナップショット

## アーキテクチャ

```
気象庁XMLフィード (eqvol.xml, extra.xml)
  │  45秒間隔でポーリング
  ▼
Poller → Dispatcher → Parser → Formatter → Priority Sort → Bluesky API
                                                │
                                          DedupStore (SQLite)
                                          StatusStore (メモリ)
                                                │
                                      /health, /status (HTTP :8080)
                                                │
                                      GitHub Pages ダッシュボード
```

## 技術スタック

- **ランタイム:** Node.js 24+
- **言語:** TypeScript
- **Bluesky SDK:** @atproto/api
- **XMLパーサー:** fast-xml-parser
- **永続化:** better-sqlite3（重複排除）
- **デプロイ:** Docker / Fly.io（東京 `nrt` リージョン）

## セットアップ

### 前提条件

- Node.js 24+
- [アプリパスワード](https://bsky.app/settings/app-passwords)を設定済みのBlueskyアカウント

### インストール

```bash
git clone https://github.com/osprey74/bsaf-jma-bot.git
cd bsaf-jma-bot
npm install
```

### 設定

`.env` ファイルを作成:

```
BLUESKY_IDENTIFIER=your-bot.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

オプションの環境変数:

| 変数 | デフォルト | 説明 |
|:-----|:----------|:-----|
| `BLUESKY_SERVICE` | `https://bsky.social` | Bluesky PDS URL |
| `POLL_INTERVAL_MS` | `45000` | フィードポーリング間隔（ミリ秒） |
| `DATA_DIR` | `./data` | SQLite DB・セッション用データディレクトリ |
| `LOG_LEVEL` | `INFO` | ログレベル（`DEBUG`, `INFO`, `WARN`, `ERROR`） |
| `STATUS_PORT` | `8080` | ヘルス/ステータスエンドポイントのHTTPポート |

### 実行

```bash
# 開発モード
npm run dev

# 本番モード
npm run build
npm start

# ドライラン（投稿なし、フォーマット結果を表示）
npx tsx src/dry-run.ts
```

### Fly.io へのデプロイ

```bash
npm run build
fly deploy
fly secrets set BLUESKY_IDENTIFIER=your-bot.bsky.social BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

## BSAFタグ

すべての投稿に6つの必須BSAFタグが付与されます:

```
bsaf:v1, type:earthquake, value:5+, time:2026-02-15T02:52:00Z, target:jp-kanto, source:jma
```

利用可能なフィルタオプションは [bot-definition.json](bot-definition.json) を参照してください。

## Bot定義ファイル

[bot-definition.json](bot-definition.json) は、このBotの情報と対応フィルタを記述した機械可読なJSONファイルです。BSAF対応クライアント（[kazahana](https://github.com/osprey74/kazahana) など）にこのファイルを登録することで、Botの投稿に対するフィルタリング機能が有効になります。

### 設置URL

ファイルは以下のURLでホストされています。クライアントにBotを登録する際はこのURLを使用してください:

```
https://raw.githubusercontent.com/osprey74/bsaf-jma-bot/main/bot-definition.json
```

### 使い方

1. BSAF対応クライアント（kazahana など）のBot管理画面を開く
2. 上記URLを入力してBotを登録する
3. クライアントが `bot-definition.json` を読み込み、フィルタUIを自動構築する
4. 災害種別・重要度・地域のフィルタを設定して、必要な防災情報だけを受け取る

### ファイル構造

| フィールド | 説明 |
|:-----------|:-----|
| `bsaf_schema` | BSAFスキーマバージョン（`"1.0"`） |
| `updated_at` | 定義ファイルの最終更新日時（ISO 8601） |
| `self_url` | このファイル自身のホストURL |
| `bot` | Bot情報（ハンドル、DID、名前、説明、データソース） |
| `filters` | 対応フィルタの配列 |

`filters` 配列には、以下の3種類のフィルタが定義されています:

| フィルタ (`tag`) | ラベル | 内容 |
|:-----------------|:-------|:-----|
| `type` | 情報種別 | 地震、津波、噴火、降灰、南海トラフ臨時、特別警報、気象警報、土砂災害、竜巻注意、記録的大雨 |
| `value` | 重み付け | 震度1〜7、情報、注意報、警報、重大警報、特別警報 |
| `target` | 地域 | 北海道、東北、関東、北陸、中部、近畿、中国、四国、九州、沖縄 |

各フィルタの `options` には `value`（BSAFタグ値）と `label`（表示名）のペアが含まれており、クライアントはこれを元にフィルタUIを構築します。

## データソース

すべてのデータは[気象庁の防災情報XML](https://xml.kishou.go.jp/xmlpull.html)を出典としています。本Botは非公式であり、気象庁とは無関係です。

## 関連プロジェクト

- [BSAFプロトコル](https://github.com/osprey74/bsaf-protocol) — プロトコル仕様書
- [kazahana](https://github.com/osprey74/kazahana) — BSAF対応 Blueskyデスクトップクライアント

## サポート

このプロジェクトが役に立ったら、開発を支援していただけると嬉しいです：

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)

## ライセンス

[MIT License](LICENSE)
