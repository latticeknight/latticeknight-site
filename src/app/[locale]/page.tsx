import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePage } from "@/components/pages/home-page";
import { getDictionary } from "@/content/get-dictionary";
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
    title: dictionary.home.metaTitle,
    description: dictionary.home.supporting,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "en-GB": "/en",
        "pt-PT": "/pt",
      },
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  return <HomePage copy={dictionary.home} locale={locale} />;
}
