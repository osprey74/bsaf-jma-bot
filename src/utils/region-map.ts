/**
 * Maps JMA prefecture codes (2-digit) to BSAF target regions.
 * Prefecture code is from the earthquake detail XML: <Pref><Code>XX</Code>
 */
const prefCodeToTarget: Record<string, string> = {
  // 北海道
  "01": "jp-hokkaido",
  // 東北
  "02": "jp-tohoku", // 青森
  "03": "jp-tohoku", // 岩手
  "04": "jp-tohoku", // 宮城
  "05": "jp-tohoku", // 秋田
  "06": "jp-tohoku", // 山形
  "07": "jp-tohoku", // 福島
  // 関東
  "08": "jp-kanto", // 茨城
  "09": "jp-kanto", // 栃木
  "10": "jp-kanto", // 群馬
  "11": "jp-kanto", // 埼玉
  "12": "jp-kanto", // 千葉
  "13": "jp-kanto", // 東京
  "14": "jp-kanto", // 神奈川
  // 北陸
  "15": "jp-hokuriku", // 新潟
  "16": "jp-hokuriku", // 富山
  "17": "jp-hokuriku", // 石川
  "18": "jp-hokuriku", // 福井
  // 中部
  "19": "jp-chubu", // 山梨
  "20": "jp-chubu", // 長野
  "21": "jp-chubu", // 岐阜
  "22": "jp-chubu", // 静岡
  "23": "jp-chubu", // 愛知
  // 近畿
  "24": "jp-kinki", // 三重
  "25": "jp-kinki", // 滋賀
  "26": "jp-kinki", // 京都
  "27": "jp-kinki", // 大阪
  "28": "jp-kinki", // 兵庫
  "29": "jp-kinki", // 奈良
  "30": "jp-kinki", // 和歌山
  // 中国
  "31": "jp-chugoku", // 鳥取
  "32": "jp-chugoku", // 島根
  "33": "jp-chugoku", // 岡山
  "34": "jp-chugoku", // 広島
  "35": "jp-chugoku", // 山口
  // 四国
  "36": "jp-shikoku", // 徳島
  "37": "jp-shikoku", // 香川
  "38": "jp-shikoku", // 愛媛
  "39": "jp-shikoku", // 高知
  // 九州
  "40": "jp-kyushu", // 福岡
  "41": "jp-kyushu", // 佐賀
  "42": "jp-kyushu", // 長崎
  "43": "jp-kyushu", // 熊本
  "44": "jp-kyushu", // 大分
  "45": "jp-kyushu", // 宮崎
  "46": "jp-kyushu", // 鹿児島
  // 沖縄
  "47": "jp-okinawa",
};

/** Convert a JMA prefecture code to a BSAF target value. */
export function prefCodeToTargetRegion(code: string): string | undefined {
  return prefCodeToTarget[code];
}

/** Get all unique BSAF target regions from a list of JMA prefecture codes. */
export function prefCodesToTargetRegions(codes: string[]): string[] {
  const targets = new Set<string>();
  for (const code of codes) {
    const target = prefCodeToTarget[code];
    if (target) targets.add(target);
  }
  return [...targets];
}
