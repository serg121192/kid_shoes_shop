/** Канонічний URL сайту — лише без www. Задай SITE_BASE_URL на Vercel. */
export const SITE_URL =
  process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://tak-i-tak.com";
export const SITE_NAME = "ТАК і ТАК";

export const STORE_ADDRESS =
  "м. Чернігів, проспект Левка Лук'яненка 78, 2-й поверх (поряд з ТРЦ «Hollywood»)";

/** Ключові запити замовника — у metadata.keywords та JSON-LD, не в один title. */
export const SEO_KEYWORDS = [
  "магазин дитячого взуття",
  "дитяче взуття чернігів",
  "магазин детской обуви",
  "детская обувь чернигов",
  "дитяче взуття",
  "взуття для дітей",
  "купити дитяче взуття",
  "черевики для дітей",
  "кросівки дитячі",
  "чернігів",
];

export const HOME_TITLE = "Магазин дитячого взуття в Чернігові";
export const HOME_DESCRIPTION =
  "Магазин дитячого взуття ТАК і ТАК у Чернігові. Дитяче взуття Чернігів — черевики, кросівки, сандалі. Самовивіз і доставка Новою Поштою по Україні.";

export const ABOUT_TITLE = "Дитяче взуття Чернігів";
export const ABOUT_DESCRIPTION =
  "Магазин дитячого взуття ТАК і ТАК у Чернігові — якісне взуття для дітей. Адреса магазину, самовивіз, доставка Новою Поштою.";

export function productCanonicalUrl(slug: string): string {
  return `${SITE_URL}/products/${encodeURIComponent(slug)}`;
}

export const JSON_LD_ALTERNATE_NAMES = [
  "Магазин дитячого взуття",
  "Дитяче взуття Чернігів",
  "Магазин детской обуви",
  "Детская обувь Чернигов",
];
