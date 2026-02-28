/**
 * Maps JMA tsunami forecast area names to BSAF target regions.
 * Tsunami areas are named by coastal segment (e.g., "千葉県九十九里・外房"),
 * so we use prefix matching on the prefecture/region name embedded in the area name.
 */

const AREA_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  // Hokkaido
  [/^北海道|^オホーツク/, "jp-hokkaido"],
  // Tohoku
  [/^青森/, "jp-tohoku"],
  [/^岩手/, "jp-tohoku"],
  [/^宮城/, "jp-tohoku"],
  [/^秋田/, "jp-tohoku"],
  [/^山形/, "jp-tohoku"],
  [/^福島/, "jp-tohoku"],
  // Kanto
  [/^茨城/, "jp-kanto"],
  [/^千葉/, "jp-kanto"],
  [/^東京湾|^伊豆諸島|^小笠原/, "jp-kanto"],
  [/^相模湾|^神奈川/, "jp-kanto"],
  // Hokuriku
  [/^新潟/, "jp-hokuriku"],
  [/^富山/, "jp-hokuriku"],
  [/^石川/, "jp-hokuriku"],
  [/^福井/, "jp-hokuriku"],
  // Chubu
  [/^静岡/, "jp-chubu"],
  [/^愛知/, "jp-chubu"],
  [/^伊勢・三河/, "jp-chubu"],
  // Kinki
  [/^三重/, "jp-kinki"],
  [/^和歌山/, "jp-kinki"],
  [/^大阪/, "jp-kinki"],
  [/^兵庫/, "jp-kinki"],
  [/^京都/, "jp-kinki"],
  [/^淡路/, "jp-kinki"],
  // Chugoku
  [/^鳥取/, "jp-chugoku"],
  [/^島根/, "jp-chugoku"],
  [/^岡山/, "jp-chugoku"],
  [/^広島/, "jp-chugoku"],
  [/^山口/, "jp-chugoku"],
  // Shikoku
  [/^徳島/, "jp-shikoku"],
  [/^香川/, "jp-shikoku"],
  [/^愛媛/, "jp-shikoku"],
  [/^高知/, "jp-shikoku"],
  // Kyushu
  [/^大分/, "jp-kyushu"],
  [/^宮崎/, "jp-kyushu"],
  [/^鹿児島/, "jp-kyushu"],
  [/^種子島|^奄美/, "jp-kyushu"],
  [/^福岡/, "jp-kyushu"],
  [/^佐賀/, "jp-kyushu"],
  [/^長崎/, "jp-kyushu"],
  [/^熊本/, "jp-kyushu"],
  [/^有明|^八代/, "jp-kyushu"],
  // Okinawa
  [/^沖縄|^大東島|^宮古島|^八重山/, "jp-okinawa"],
];

/** Map a JMA tsunami forecast area name to a BSAF target region. */
export function tsunamiAreaToTarget(areaName: string): string | undefined {
  for (const [pattern, target] of AREA_PATTERNS) {
    if (pattern.test(areaName)) return target;
  }
  return undefined;
}

/** Get all unique BSAF target regions from a list of tsunami area names. */
export function tsunamiAreasToTargets(areaNames: string[]): string[] {
  const targets = new Set<string>();
  for (const name of areaNames) {
    const target = tsunamiAreaToTarget(name);
    if (target) targets.add(target);
  }
  return [...targets];
}
