import "server-only";

import type { Locale, SiteDictionary } from "@/lib/site";

const dictionaries: Record<Locale, () => Promise<SiteDictionary>> = {
  en: () => import("./en").then((module) => module.en),
  pt: () => import("./pt").then((module) => module.pt),
};

export function getDictionary(locale: Locale): Promise<SiteDictionary> {
  return dictionaries[locale]();
}
