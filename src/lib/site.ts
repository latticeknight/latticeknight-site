export const locales = ["en", "pt"] as const;

export type Locale = (typeof locales)[number];

export const pageSlugs = [
  "home",
  "systems",
  "sdlc",
  "workflows",
  "automation",
  "tooling",
  "lab",
  "notes",
  "about",
  "contact",
] as const;

export type PageSlug = (typeof pageSlugs)[number];

export const pagePaths: Record<PageSlug, string> = {
  home: "",
  systems: "systems",
  sdlc: "agentic-sdlc",
  workflows: "workflows",
  automation: "automation",
  tooling: "ai-tooling",
  lab: "lab",
  notes: "field-notes",
  about: "about",
  contact: "contact",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isPageSlug(value: string): value is PageSlug {
  return pageSlugs.includes(value as PageSlug);
}

export function hrefFor(locale: Locale, slug: PageSlug): string {
  const path = pagePaths[slug];
  return path ? `/${locale}/${path}` : `/${locale}`;
}

export function slugFromPathname(pathname: string): PageSlug {
  const path = pathname.split("/").filter(Boolean)[1] ?? "";
  return (
    Object.entries(pagePaths).find(([, value]) => value === path)?.[0] ?? "home"
  ) as PageSlug;
}

export function slugFromSegment(segment: string): PageSlug | null {
  const entry = Object.entries(pagePaths).find(([, value]) => value === segment);
  return entry ? (entry[0] as PageSlug) : null;
}

export type Facet = { tag: string; body: string };
export type LabelBody = { label: string; body: string };
export type TitleBody = { title: string; body: string };

export type SiteDictionary = {
  localeName: string;
  common: {
    nav: Record<PageSlug, string>;
    tags: Record<PageSlug, string>;
    menu: string;
    close: string;
    map: string;
    loading: string;
    language: string;
    skipContent: string;
    primaryNavigation: string;
    mobileNavigation: string;
    introduction: string;
    current: string;
    visited: string;
    mapHint: string;
    menuHint: string;
    footerSystem: string;
    footerExplored: string;
    introStatement: [string, string];
    enter: string;
    skipIntro: string;
  };
  home: {
    metaTitle: string;
    metaDescription: string;
    socialRole: string;
    regionLabel: string;
    kicker: string;
    hero: [string, string, string];
    supporting: string;
    ctas: [string, string, string];
    cards: Array<{
      label: string;
      tone: "cyan" | "amber" | "muted";
      title: string;
      body: string;
      link: string;
      target: PageSlug;
      live?: boolean;
    }>;
    connectionLabel: string;
    connectionBody: string;
    mapLink: string;
    availability: string;
    contactLink: string;
  };
  systems: {
    legendLabel: string;
    kicker: string;
    title: string;
    intro: string;
    legend: [string, string, string, string];
    foundMyPro: {
      status: string;
      intro: string;
      facets: Facet[];
      openQuestions: TitleBody;
      lessons: TitleBody;
    };
    sentinel: {
      status: string;
      intro: string;
      facets: Facet[];
    };
    honesty: string;
  };
  sdlc: {
    kicker: string;
    title: string;
    intro: string;
    selector: string;
    responsibility: string;
    actors: string[];
    stages: Array<{ label: string; name: string; detail: string; weights: number[] }>;
    failuresTitle: string;
    failuresIntro: string;
    mitigation: string;
    flipFor: string;
    flipBack: string;
    failures: Array<{ name: string; problem: string; fix: string }>;
  };
  workflows: {
    kicker: string;
    title: string;
    intro: string;
    featureLabel: string;
    featureTitle: string;
    stages: string[];
    fields: Facet[];
    notWhen: string;
    patterns: Array<{ number: string; name: string; problem: string; notWhen: string }>;
  };
  automation: {
    kicker: string;
    title: string;
    intro: string;
    continuum: Array<LabelBody>;
    items: Array<{ name: string; tier: string; body: string }>;
  };
  tooling: {
    kicker: string;
    title: string;
    intro: string;
    selector: string;
    discipline: string;
    roles: Array<{ label: string; name: string; body: string; discipline: string }>;
    designer: string;
    caveat: string;
    sliderLabels: string[];
    levels: string[];
    recommendation: string;
    recommendations: {
      script: { title: string; lines: string[] };
      highRisk: { title: string; lines: string[]; validation: string };
      complex: { title: string; lines: string[] };
      moderate: { title: string; lines: string[] };
      cost: string;
      repetition: string;
    };
  };
  lab: {
    kicker: string;
    title: string;
    intro: string;
    items: Array<{
      status: string;
      tone: "cyan" | "amber" | "muted";
      discarded?: boolean;
      name: string;
      body: string;
    }>;
  };
  notes: {
    categoriesLabel: string;
    kicker: string;
    title: string;
    intro: string;
    categories: string[];
    items: Array<{
      title: string;
      body: string;
      category: string;
      origin: string;
      target: PageSlug;
    }>;
  };
  about: {
    kicker: string;
    title: string;
    paragraphs: string[];
    preference: string;
  };
  contact: {
    kicker: string;
    title: string;
    intro: string;
    routes: Array<{ name: string; body: string; subject: string }>;
    replyNote: string;
  };
};
