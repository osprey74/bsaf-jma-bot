/**
 * Maps JMA volcano names to BSAF target regions.
 * Used for ashfall forecasts where the content text contains the volcano name
 * but no structured area codes.
 */

const VOLCANO_TO_REGION: Record<string, string> = {
  // Hokkaido
  "十勝岳": "jp-hokkaido",
  "有珠山": "jp-hokkaido",
  "樽前山": "jp-hokkaido",
  "北海道駒ヶ岳": "jp-hokkaido",
  "駒ヶ岳": "jp-hokkaido",
  "雌阿寒岳": "jp-hokkaido",
  "大雪山": "jp-hokkaido",
  "アトサヌプリ": "jp-hokkaido",
  "倶多楽": "jp-hokkaido",
  "恵山": "jp-hokkaido",
  "雄阿寒岳": "jp-hokkaido",
  "利尻山": "jp-hokkaido",
  "羅臼岳": "jp-hokkaido",
  "天頂山": "jp-hokkaido",
  // Tohoku
  "岩木山": "jp-tohoku",
  "八甲田山": "jp-tohoku",
  "十和田": "jp-tohoku",
  "秋田焼山": "jp-tohoku",
  "岩手山": "jp-tohoku",
  "秋田駒ヶ岳": "jp-tohoku",
  "鳥海山": "jp-tohoku",
  "栗駒山": "jp-tohoku",
  "蔵王山": "jp-tohoku",
  "吾妻山": "jp-tohoku",
  "安達太良山": "jp-tohoku",
  "磐梯山": "jp-tohoku",
  // Kanto
  "那須岳": "jp-kanto",
  "日光白根山": "jp-kanto",
  "草津白根山": "jp-kanto",
  "箱根山": "jp-kanto",
  "伊豆東部火山群": "jp-kanto",
  "伊豆大島": "jp-kanto",
  "三宅島": "jp-kanto",
  "八丈島": "jp-kanto",
  "青ヶ島": "jp-kanto",
  "硫黄島": "jp-kanto",
  "西之島": "jp-kanto",
  "福徳岡ノ場": "jp-kanto",
  // Hokuriku
  "新潟焼山": "jp-hokuriku",
  "弥陀ヶ原": "jp-hokuriku",
  // Chubu
  "浅間山": "jp-chubu",
  "焼岳": "jp-chubu",
  "乗鞍岳": "jp-chubu",
  "御嶽山": "jp-chubu",
  "白山": "jp-chubu",
  "富士山": "jp-chubu",
  // Chugoku
  "三瓶山": "jp-chugoku",
  // Kyushu
  "鶴見岳・伽藍岳": "jp-kyushu",
  "九重山": "jp-kyushu",
  "阿蘇山": "jp-kyushu",
  "雲仙岳": "jp-kyushu",
  "霧島山": "jp-kyushu",
  "新燃岳": "jp-kyushu",
  "桜島": "jp-kyushu",
  "薩摩硫黄島": "jp-kyushu",
  "口永良部島": "jp-kyushu",
  "諏訪之瀬島": "jp-kyushu",
  // Okinawa
  "硫黄鳥島": "jp-okinawa",
  "西表島北北東海底火山": "jp-okinawa",
};

/** Map a volcano name to a BSAF target region. */
export function volcanoToTarget(volcanoName: string): string | undefined {
  // Exact match first
  if (VOLCANO_TO_REGION[volcanoName]) return VOLCANO_TO_REGION[volcanoName];
  // Partial match (volcano name may have suffixes in content text)
  for (const [name, target] of Object.entries(VOLCANO_TO_REGION)) {
    if (volcanoName.includes(name) || name.includes(volcanoName)) return target;
  }
  return undefined;
}
