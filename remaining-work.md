# bsaf-jma-bot — Remaining Work

## タスク

### 災害情報パース機能の拡張（地震以外の災害種別対応）

#### ステップ1 — 基盤リファクタリング

- [x] ポーラーの汎用化 — `fetchEarthquakeEntries()` を `fetchFeedEntries()` に拡張し、全対象タイトルのフィルタリングとタイプ判別情報の付加に対応する
- [x] 型定義の整備 — `DisasterInfo` ユニオン型を定義し、各災害種別（`TsunamiInfo`, `EruptionInfo` 等）のインターフェースを追加する
- [x] ディスパッチャーの実装 — `index.ts` のポーリングループにタイプ→パーサー→フォーマッターのルーティング処理を追加する
- [x] `extra.xml` フィードの追加 — `config.ts` にフィードURLを追加し、`index.ts` で `eqvol.xml` と `extra.xml` の両方をポーリングする

#### ステップ2 — 既存フィード内の災害種別追加（`eqvol.xml`）

- [x] 津波警報・注意報の実装 — 詳細XMLパーサー (`parser/tsunami.ts`)、フォーマッター、BSAFタグ生成（`type:tsunami`, `value:advisory|warning|special-warning`）
- [x] 噴火速報・噴火警報の実装 — 詳細XMLパーサー (`parser/eruption.ts`)、フォーマッター、BSAFタグ生成（`type:eruption`, `value:advisory|warning|special-warning`）
- [x] 降灰予報の実装 — `entry.content` ベースのパーサー、フォーマッター、BSAFタグ生成（`type:ashfall`, `value:info|advisory`）
- [x] 南海トラフ臨時情報の実装 — 詳細XMLパーサー (`parser/nankai-trough.ts`)、フォーマッター、BSAFタグ生成（`type:nankai-trough`, `value:advisory|warning|special-warning`）

#### ステップ3 — 新規フィードの災害種別追加（`extra.xml`）

- [x] 気象特別警報の実装 — 詳細XMLパーサー (`parser/special-warning.ts`)、フォーマッター、BSAFタグ生成（`type:special-warning`, `value:special-warning`）
- [x] 気象警報・注意報の実装 — XML/contentハイブリッドパーサー (`parser/weather-warning.ts`)、フォーマッター、BSAFタグ生成（`type:weather-warning`, `value:advisory|warning|severe-warning|special-warning`）、投稿基準：警報以上
- [x] 土砂災害警戒情報の実装 — `entry.content` ベースのパーサー (`parser/landslide-warning.ts`)、フォーマッター、BSAFタグ生成（`type:landslide-warning`, `value:warning`）
- [x] 竜巻注意情報の実装 — `entry.content` ベースのパーサー (`parser/tornado-warning.ts`)、フォーマッター、BSAFタグ生成（`type:tornado-warning`, `value:warning`）
- [x] 記録的短時間大雨情報の実装 — `entry.content` ベースのパーサー (`parser/heavy-rain.ts`)、フォーマッター、BSAFタグ生成（`type:heavy-rain`, `value:warning`）

#### ステップ4 — 仕上げ

- [x] 優先度キューの実装 — P0（大津波警報等）〜P4（低震度等）の優先度ソート方式を導入（`src/poster/priority.ts`）。P0はminIntervalバイパスで即時投稿
- [x] `bot-definition.json` の更新 — 全10災害種別の `type` フィルタ、震度+警報レベル混合の `value` フィルタを追加
- [x] ドキュメント更新 — 仕様書のモジュール構成（§8.2）・アーキテクチャ図（§8.1）・優先度実装ノート（§7.4）を更新

### リリース準備

- [x] ドライラン検証 — ライブJMAフィードで全10災害種別の動作を確認（204エントリ、102件正常フォーマット）
- [x] `README.md`（英語）/ `README-ja.md`（日本語）の作成
- [x] Blueskyアカウント作成 — `jma-alert-bot.bsky.social`
- [x] `bot-definition.json` に DID を設定 — `did:plc:vwi7zhfyamyvrg5v6ycjgzxi`
- [x] リポジトリ公開 — `bsaf-protocol` / `bsaf-jma-bot` ともにPUBLIC
- [x] `bot-definition.json` の外部アクセス確認（HTTP 200）
- [x] Bluesky接続テスト — ログイン成功
- [x] ローカル本番モード実行テスト — 投稿・パース・優先度ソート正常動作確認

### 今後の作業

- [x] Fly.ioへのデプロイ — `fly deploy` + `fly secrets set` で本番稼働開始
- [x] 起動時キャッチアップの実装 — `eqvol_l.xml` / `extra_l.xml` 長期フィードの対応（仕様書 §3.1）
- [x] BSAF紹介投稿 — Botアカウントの固定投稿としてBSAFの概要・フィルタリング機能・開発者向け情報を投稿
- [x] bsaf-protocol ロードマップ更新 — Phase 1 のリファレンスBot公開・Bot定義JSON公開を完了マーク

## 2ボット役割再編ロードマップ（地象/気象 分割）

### 方針（2026-08-01 確定）

- 分割軸を「新旧電文（経過措置ベース）」から「**地象・海象・火山 vs 気象**」へ再編する。
  - **JMABot** ＝ 地震・津波・噴火・降灰・南海トラフ（地象系）
  - **KikikuruBot** ＝ 気象警報・注意報全般＋気象系速報（気象系）
- 根拠：電文量が桁違いに非対称（気象は数千件規模／地震・津波は少数）で、混在させると生命に直結する地震・津波投稿が埋没する。障害・レート制限の分離、アカウント＝粗いフィルタとしての価値。
- 前提事実（2026-08-01 一次データ確認）：旧様式気象警報の内容はキキクルBotがR06形式で配信済み。ただし**洪水はR06対象外**（指定河川洪水予報へ分離）で現状どちらも未配信。

### フェーズA — JMABot: 地象系カバレッジ・ギャップ補完（本リポジトリ）

- [ ] 長周期地震動に関する観測情報（VXSE62）対応 — 高層building安全で重要性増
- [ ] 火山の状況に関する解説情報（VFVO51）対応 — 中優先
- [ ] 竜巻パターン堅牢化（`/竜巻注意情報/` → Title変更「気象防災速報（竜巻注意）」に先回り）— フェーズBで移管するまでの経過措置

### フェーズB — 気象系情報の KikikuruBot への集約・新設（別リポジトリ `bsaf-kikikuru-bot`）

> KikikuruBot 側タスク。`bsaf-kikikuru-bot/remaining-work.md` にも起票のこと。

- [ ] **洪水（指定河川洪水予報 VXKO53/54/57/70）新設** ★必須（フェーズCのVPWW53/54撤退の前提）
- [ ] 台風情報（進路・予報 VPTW60 ／ 暴風域に入る確率 VPTA50）新設
- [ ] 線状降水帯・顕著な大雨/大雪・記録的短時間大雨（VPBS50）新設
- [ ] 気象情報（府県 VPFJ50 ／ 地方 VPCJ50 ／ 全般 VPZJ50）新設 — 警報前段の見通し
- [ ] 熱中症警戒アラート（VPFT50）新設 — 要判断・高volume（独立フィルタ前提）
- [ ] 竜巻注意情報（VPHW50/51）を JMABot から移管
- [ ] 土砂災害警戒情報（VXWW50）を JMABot から移管
- [ ] 記録的短時間大雨（VPOA50）を移管（VPBS50移行と整合、二重投稿回避）

### フェーズC — JMABot からの気象系撤退（本リポジトリ）

- [x] 竜巻・土砂・記録的短時間大雨パーサーを削除（2026-08-01、キキクル側移管稼働確認後）
- [x] 旧様式気象警報（VPWW53/54）weather-warning / special-warning を削除（2026-08-01、キキクルのR06(VPWW55-61)＋洪水で等価配信を確認のうえ実施）
- [x] JMABot を純・地象/海象/火山Botとして `bot-definition.json` / README を更新（2026-08-01）— parser 5ファイル＋pref-name-map を削除、地象系5種（地震・津波・噴火・降灰・南海トラフ）のみに

### フェーズD — 既存フォロワーへの告知

- [ ] 告知投稿（下書き：`g:\dev\bluesky-posts-bot-reorg.md`）
  - 投稿順序：キキクル実装稼働 → ②キキクル拡充告知 → ①JMABot整理告知（逆順は取りこぼしリスク）

### 優先度・依存関係

- **洪水（B）** は VPWW53/54撤退（C）の前提 → 最優先
- **告知（D）** は B の実装稼働が前提
- **長周期地震動・火山解説（A）** は独立、いつでも着手可

### 完了済み（関連）

- [x] 発表官署の出典行併記＋気象警報の県名補完（津波・噴火・南海トラフ・特別警報・気象警報、commit `c60e7ce`）

### 注意事項（実装時の参照用）

- **2026年電文改正**: 集約通報・気象防災速報が新設予定。タイトルは正規表現マッチング推奨
- **詳細XML取得要否**: 津波・噴火・特別警報・南海トラフは詳細XML必要、それ以外は `entry.content` で対応可
- **絵文字分類**: 🟣 最大危険 / 🔴 高 / 🟠 警戒 / 🟡 注意・情報
- **BSAFタグ上限**: AT Protocol制約で最大8タグ・640バイト（必須6 + 予備2）
- **帯域制限**: JMA XML取得は10GB/日が上限。`extra.xml` の高頻度ポーリングに注意
