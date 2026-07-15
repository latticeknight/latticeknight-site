import type { MetadataRoute } from "next";

import { hrefFor, locales, pageSlugs } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://eduardoneto.com";
  return locales.flatMap((locale) =>
    pageSlugs.map((slug) => ({
      url: `${baseUrl}${hrefFor(locale, slug)}`,
      changeFrequency: slug === "notes" ? "weekly" : "monthly",
      priority: slug === "home" ? 1 : slug === "systems" || slug === "sdlc" ? 0.9 : 0.7,
      alternates: {
        languages: {
          "en-GB": `${baseUrl}${hrefFor("en", slug)}`,
          "pt-PT": `${baseUrl}${hrefFor("pt", slug)}`,
        },
      },
    })),
  );
}
