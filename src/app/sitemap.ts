import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/metadata";
import { hrefFor, locales, pageSlugs } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    pageSlugs.map((slug) => ({
      url: `${SITE_URL}${hrefFor(locale, slug)}`,
      changeFrequency: slug === "notes" ? "weekly" : "monthly",
      priority: slug === "home" ? 1 : slug === "systems" || slug === "sdlc" ? 0.9 : 0.7,
      alternates: {
        languages: {
          "en-GB": `${SITE_URL}${hrefFor("en", slug)}`,
          "pt-PT": `${SITE_URL}${hrefFor("pt", slug)}`,
        },
      },
    })),
  );
}
