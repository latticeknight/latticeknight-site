import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { SiteShell } from "@/components/site-shell";
import { getDictionary } from "@/content/get-dictionary";
import { SITE_NAME, SITE_TITLE_SUFFIX, SITE_URL } from "@/lib/metadata";
import { isLocale, locales } from "@/lib/site";
import "../globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s ${SITE_TITLE_SUFFIX}`,
  },
  description:
    "Systems, products and practical methods for reliable software engineering with AI agents.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);

  return (
    <html
      className={`${archivo.variable} ${ibmPlexMono.variable}`}
      data-scroll-behavior="smooth"
      lang={locale === "en" ? "en-GB" : "pt-PT"}
    >
      <head>
        <noscript>
          <style>{`
            .site-shell--intro-pending .site-intro-v2-background,
            .site-shell--intro-pending .site-intro-v2,
            .site-shell--intro-pending .lattice-canvas { display: none !important; }
            .site-shell--intro-pending .site-header,
            .site-shell--intro-pending .page-transition,
            .site-shell--intro-pending .site-footer {
              opacity: 1 !important;
              pointer-events: auto !important;
            }
            .site-shell--intro-pending .page-transition { animation: none !important; }
          `}</style>
        </noscript>
      </head>
      <body>
        <SiteShell dictionary={dictionary} locale={locale}>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
