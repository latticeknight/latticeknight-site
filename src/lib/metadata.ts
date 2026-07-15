import type { Locale } from "@/lib/site";

export const SITE_NAME = "Eduardo Neto · latticeknight";
export const SITE_TITLE_SUFFIX = "· Eduardo Neto";
export const SITE_URL = "https://www.eduardoneto.com";

export function openGraphLocale(locale: Locale): "en_GB" | "pt_PT" {
  return locale === "en" ? "en_GB" : "pt_PT";
}

export function alternateOpenGraphLocale(locale: Locale): "en_GB" | "pt_PT" {
  return locale === "en" ? "pt_PT" : "en_GB";
}
