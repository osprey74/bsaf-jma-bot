/**
 * Maps Japanese prefecture names found in JMA content text to BSAF target regions.
 * Used by content-based parsers (landslide, tornado, heavy-rain, weather-warning).
 */

const PREF_NAME_TO_TARGET: ReadonlyArray<[RegExp, string]> = [
  // 北海道
  [/北海道/, "jp-hokkaido"],
  // 東北
  [/青森/, "jp-tohoku"],
  [/岩手/, "jp-tohoku"],
  [/宮城/, "jp-tohoku"],
  [/秋田/, "jp-tohoku"],
  [/山形/, "jp-tohoku"],
  [/福島/, "jp-tohoku"],
  // 関東
  [/茨城/, "jp-kanto"],
  [/栃木/, "jp-kanto"],
  [/群馬/, "jp-kanto"],
  [/埼玉/, "jp-kanto"],
  [/千葉/, "jp-kanto"],
  [/東京/, "jp-kanto"],
  [/神奈川/, "jp-kanto"],
  // 北陸
  [/新潟/, "jp-hokuriku"],
  [/富山/, "jp-hokuriku"],
  [/石川/, "jp-hokuriku"],
  [/福井/, "jp-hokuriku"],
  // 中部
  [/山梨/, "jp-chubu"],
  [/長野/, "jp-chubu"],
  [/岐阜/, "jp-chubu"],
  [/静岡/, "jp-chubu"],
  [/愛知/, "jp-chubu"],
  // 近畿
  [/三重/, "jp-kinki"],
  [/滋賀/, "jp-kinki"],
  [/京都/, "jp-kinki"],
  [/大阪/, "jp-kinki"],
  [/兵庫/, "jp-kinki"],
  [/奈良/, "jp-kinki"],
  [/和歌山/, "jp-kinki"],
  // 中国
  [/鳥取/, "jp-chugoku"],
  [/島根/, "jp-chugoku"],
  [/岡山/, "jp-chugoku"],
  [/広島/, "jp-chugoku"],
  [/山口/, "jp-chugoku"],
  // 四国
  [/徳島/, "jp-shikoku"],
  [/香川/, "jp-shikoku"],
  [/愛媛/, "jp-shikoku"],
  [/高知/, "jp-shikoku"],
  // 九州
  [/福岡/, "jp-kyushu"],
  [/佐賀/, "jp-kyushu"],
  [/長崎/, "jp-kyushu"],
  [/熊本/, "jp-kyushu"],
  [/大分/, "jp-kyushu"],
  [/宮崎/, "jp-kyushu"],
  [/鹿児島/, "jp-kyushu"],
  // 沖縄
  [/沖縄/, "jp-okinawa"],
];

/**
 * Extract the first BSAF target region from a Japanese text string
 * by matching prefecture names.
 */
export function extractTargetFromText(text: string): string | null {
  for (const [pattern, target] of PREF_NAME_TO_TARGET) {
    if (pattern.test(text)) return target;
  }
  return null;
}
