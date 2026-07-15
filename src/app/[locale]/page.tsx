import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePage } from "@/components/pages/home-page";
import { getDictionary } from "@/content/get-dictionary";
import {
  alternateOpenGraphLocale,
  openGraphLocale,
  SITE_NAME,
} from "@/lib/metadata";
import { isLocale } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  return {
    title: { absolute: dictionary.home.metaTitle },
    description: dictionary.home.metaDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "en-GB": "/en",
        "pt-PT": "/pt",
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: `/${locale}`,
      title: dictionary.home.metaTitle,
      description: dictionary.home.metaDescription,
      locale: openGraphLocale(locale),
      alternateLocale: [alternateOpenGraphLocale(locale)],
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.home.metaTitle,
      description: dictionary.home.metaDescription,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  return <HomePage copy={dictionary.home} locale={locale} />;
}
