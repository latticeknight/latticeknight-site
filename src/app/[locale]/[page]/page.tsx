import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AboutPage } from "@/components/pages/about-page";
import { AutomationPage } from "@/components/pages/automation-page";
import { ContactPage } from "@/components/pages/contact-page";
import { LabPage } from "@/components/pages/lab-page";
import { NotesPage } from "@/components/pages/notes-page";
import { SdlcPage } from "@/components/pages/sdlc-page";
import { SystemsPage } from "@/components/pages/systems-page";
import { ToolingPage } from "@/components/pages/tooling-page";
import { WorkflowsPage } from "@/components/pages/workflows-page";
import { getDictionary } from "@/content/get-dictionary";
import {
  alternateOpenGraphLocale,
  openGraphLocale,
  SITE_NAME,
} from "@/lib/metadata";
import {
  isLocale,
  locales,
  pagePaths,
  pageSlugs,
  slugFromSegment,
} from "@/lib/site";

type Params = Promise<{ locale: string; page: string }>;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    pageSlugs
      .filter((slug) => slug !== "home")
      .map((slug) => ({ locale, page: pagePaths[slug] })),
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale)) return {};
  const slug = slugFromSegment(page);
  if (!slug || slug === "home") return {};
  const dictionary = await getDictionary(locale);
  const copy = dictionary[slug] as { title?: string; intro?: string };
  const socialTitle = copy.title ? `${copy.title} · Eduardo Neto` : SITE_NAME;
  return {
    title: copy.title,
    description: copy.intro,
    alternates: {
      canonical: `/${locale}/${page}`,
      languages: {
        "en-GB": `/en/${page}`,
        "pt-PT": `/pt/${page}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: `/${locale}/${page}`,
      title: socialTitle,
      description: copy.intro,
      locale: openGraphLocale(locale),
      alternateLocale: [alternateOpenGraphLocale(locale)],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: copy.intro,
    },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { locale, page } = await params;
  if (!isLocale(locale)) notFound();
  const slug = slugFromSegment(page);
  if (!slug || slug === "home") notFound();
  const dictionary = await getDictionary(locale);

  switch (slug) {
    case "systems":
      return <SystemsPage copy={dictionary.systems} />;
    case "sdlc":
      return <SdlcPage copy={dictionary.sdlc} />;
    case "workflows":
      return <WorkflowsPage copy={dictionary.workflows} />;
    case "automation":
      return <AutomationPage copy={dictionary.automation} />;
    case "tooling":
      return <ToolingPage copy={dictionary.tooling} />;
    case "lab":
      return <LabPage copy={dictionary.lab} />;
    case "notes":
      return <NotesPage copy={dictionary.notes} locale={locale} />;
    case "about":
      return <AboutPage copy={dictionary.about} />;
    case "contact":
      return <ContactPage copy={dictionary.contact} />;
  }
}
