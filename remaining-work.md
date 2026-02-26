# bsaf-jma-bot — Remaining Work

## タスク

### 災害情報パース機能の拡張（地震以外の災害種別対応）

#### ステップ1 — 基盤リファクタリング

- [x] ポーラーの汎用化 — `fetchEarthquakeEntries()` を `fetchFeedEntries()` に拡張し、全対象タイトルのフィルタリングとタイプ判別情報の付加に対応する
- [x] 型定義の整備 — `DisasterInfo` ユニオン型を定義し、各災害種別（`TsunamiInfo`, `EruptionInfo` 等）のインターフェースを追加する
- [x] ディスパッチャーの実装 — `index.ts` のポーリングループにタイプ→パーサー→フォーマッターのルーティング処理を追加する
- [x] `extra.xml` フィードの追加 — `config.ts` にフィードURLを追加し、`index.ts` で `eqvol.xml` と `extra.xml` の両方をポーリングする

#### ステップ2 — 既存フィード内の災害種別追加（`eqvol.xml`）

- [ ] 津波警報・注意報の実装 — 詳細XMLパーサー (`parser/tsunami.ts`)、フォーマッター、BSAFタグ生成（`type:tsunami`, `value:advisory|warning|major-warning`）
- [ ] 噴火速報・噴火警報の実装 — 詳細XMLパーサー (`parser/eruption.ts`)、フォーマッター、BSAFタグ生成（`type:eruption`, `value:advisory|warning|special-warning`）
- [ ] 降灰予報の実装 — `entry.content` ベースのパーサー、フォーマッター、BSAFタグ生成（`type:ashfall`, `value:info|advisory`）
- [ ] 南海トラフ臨時情報の実装 — 詳細XMLパーサー (`parser/nankai-trough.ts`)、フォーマッター、BSAFタグ生成（`type:nankai-trough`, `value:special-warning`）

#### ステップ3 — 新規フィードの災害種別追加（`extra.xml`）

- [ ] 気象特別警報の実装 — 詳細XMLパーサー (`parser/special-warning.ts`)、フォーマッター、BSAFタグ生成（`type:special-warning`, `value:special-warning`）
- [ ] 気象警報・注意報の実装 — `entry.content` ベースのパーサー、フォーマッター、BSAFタグ生成（`type:weather-warning`, `value:advisory|warning|severe-warning`）
- [ ] 土砂災害警戒情報の実装 — `entry.content` ベースのパーサー、フォーマッター、BSAFタグ生成（`type:landslide-warning`, `value:warning`）
- [ ] 竜巻注意情報の実装 — `entry.content` ベースのパーサー、フォーマッター、BSAFタグ生成（`type:tornado-warning`, `value:warning`）
- [ ] 記録的短時間大雨情報の実装 — `entry.content` ベースのパーサー、フォーマッター、BSAFタグ生成（`type:heavy-rain`, `value:warning`）

#### ステップ4 — 仕上げ

- [ ] 優先度キューの実装 — P0（大津波警報等）〜P4（低震度等）の優先度付きキュー処理を導入する
- [ ] `bot-definition.json` の更新 — 全災害種別の `type`, `value` フィルタオプションを追加する
- [ ] ドキュメント更新 — 仕様書・README等への反映

### 注意事項（実装時の参照用）

- **2026年電文改正**: 集約通報・気象防災速報が新設予定。タイトルは正規表現マッチング推奨
- **詳細XML取得要否**: 津波・噴火・特別警報・南海トラフは詳細XML必要、それ以外は `entry.content` で対応可
- **絵文字分類**: 🟣 最大危険 / 🔴 高 / 🟠 警報 / 🟡 注意 / 🔵 情報
- **BSAFタグ上限**: AT Protocol制約で最大8タグ・640バイト（必須6 + 予備2）
- **帯域制限**: JMA XML取得は10GB/日が上限。`extra.xml` の高頻度ポーリングに注意
