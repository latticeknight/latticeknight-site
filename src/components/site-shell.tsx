"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent } from "react";

import { LatticeCanvas } from "@/components/lattice-canvas";
import { LatticeIntro, type LatticeIntroStage } from "@/components/lattice-intro";
import { markIntroDone } from "@/lib/intro-decision";
import { hrefFor, pageSlugs, slugFromPathname, type Locale, type PageSlug, type SiteDictionary } from "@/lib/site";

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function LanguageSwitch({ locale, current, label }: { locale: Locale; current: PageSlug; label: string }) {
  return (
    <div aria-label={label} className="language-switch" role="group">
      <Link aria-current={locale === "en" ? "true" : undefined} href={hrefFor("en", current)}>EN</Link>
      <span aria-hidden="true">/</span>
      <Link aria-current={locale === "pt" ? "true" : undefined} href={hrefFor("pt", current)}>PT</Link>
    </div>
  );
}

export function SiteShell({
  children,
  locale,
  dictionary,
}: {
  children: React.ReactNode;
  locale: Locale;
  dictionary: SiteDictionary;
}) {
  const pathname = usePathname();
  const current = slugFromPathname(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [routePending, setRoutePending] = useState(false);
  const [visited, setVisited] = useState<PageSlug[]>(["home"]);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [introStage, setIntroStage] = useState<LatticeIntroStage>(current === "home" ? "pending" : "complete");
  const [introSkipKey, setIntroSkipKey] = useState(0);
  const mapTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreMapFocusRef = useRef(false);
  const pendingPathRef = useRef<string | null>(null);
  const pendingStartedAtRef = useRef(0);
  const common = dictionary.common;
  const introVisible = current === "home" && introStage !== "complete";
  const introBlocksInterface = hydrated && introVisible && introStage !== "handoff";

  const handleIntroStart = useCallback(() => setIntroStage("forming"), []);
  const handleIntroIdentity = useCallback(() => setIntroStage("identity"), []);
  const handleIntroHandoff = useCallback(() => setIntroStage("handoff"), []);
  const handleIntroComplete = useCallback(() => setIntroStage("complete"), []);
  const handleIntroSkip = useCallback(() => {
    setIntroStage("complete");
    setIntroSkipKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (current !== "home" || introStage !== "complete") return;
    markIntroDone();
  }, [current, introStage]);

  useEffect(() => {
    if (!introBlocksInterface) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [introBlocksInterface]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!routePending || pendingPathRef.current !== pathname) return;
    const minimumVisibleTime = 360;
    const elapsed = performance.now() - pendingStartedAtRef.current;
    const timer = window.setTimeout(() => {
      setRoutePending(false);
      pendingPathRef.current = null;
    }, Math.max(0, minimumVisibleTime - elapsed));
    return () => window.clearTimeout(timer);
  }, [pathname, routePending]);

  useEffect(() => {
    if (!routePending) return;
    const timer = window.setTimeout(() => {
      setRoutePending(false);
      pendingPathRef.current = null;
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [routePending]);

  useEffect(() => {
    let stored: PageSlug[] = [];
    try {
      const saved = window.sessionStorage.getItem("lk-visited");
      stored = saved
        ? (JSON.parse(saved) as string[]).filter((value): value is PageSlug => pageSlugs.includes(value as PageSlug))
        : [];
    } catch {
      stored = [];
    }
    const timer = window.setTimeout(() => {
      setVisited((previous) => Array.from(new Set([...previous, ...stored, current])));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem("lk-visited", JSON.stringify(visited));
    } catch {
      // Session storage is optional; the site remains usable without it.
    }
  }, [visited]);

  useEffect(() => {
    const openMap = () => setMapOpen(true);
    window.addEventListener("lattice:open-map", openMap);
    return () => window.removeEventListener("lattice:open-map", openMap);
  }, []);

  useEffect(() => {
    if (!menuOpen && !mapOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        restoreMapFocusRef.current = mapOpen;
        setMapOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mapOpen, menuOpen]);

  useEffect(() => {
    if (mapOpen || !restoreMapFocusRef.current) return;
    mapTriggerRef.current?.focus({ preventScroll: true });
    restoreMapFocusRef.current = false;
  }, [mapOpen]);

  function closeOverlays() {
    setMenuOpen(false);
    setMapOpen(false);
  }

  function closeMapAndRestoreFocus() {
    restoreMapFocusRef.current = true;
    setMapOpen(false);
  }

  function handleNavigationIntent(event: ReactMouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
    if (anchor.target && anchor.target !== "_self") return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

    pendingPathRef.current = destination.pathname;
    pendingStartedAtRef.current = performance.now();
    setRoutePending(true);
  }

  return (
    <div
      className={`site-shell${introVisible ? ` site-shell--intro-${introStage}` : ""}${mapOpen ? " site-shell--lattice-open" : ""}`}
      onClickCapture={handleNavigationIntent}
    >
      <a
        className="skip-link"
        href="#main-content"
        tabIndex={mapOpen || introBlocksInterface ? -1 : undefined}
      >
        {common.skipContent}
      </a>
      <div
        aria-hidden="true"
        className={routePending ? "route-progress route-progress--active" : "route-progress"}
      >
        <span />
      </div>
      <span aria-live="polite" className="sr-only" role="status">
        {routePending ? common.loading : ""}
      </span>
      <LatticeCanvas
        active={current}
        closeLabel={common.close}
        introEnabled={current === "home"}
        introSkipKey={introSkipKey}
        labels={common.tags}
        locale={locale}
        navigatorHint={common.mapHint}
        navigatorLabel={common.map}
        navigatorOpen={mapOpen}
        onIntroComplete={handleIntroComplete}
        onIntroHandoff={handleIntroHandoff}
        onIntroIdentity={handleIntroIdentity}
        onIntroStart={handleIntroStart}
        onNavigatorClose={closeMapAndRestoreFocus}
        onNavigatorNavigate={closeOverlays}
        visited={visited}
      />
      {introVisible ? <LatticeIntro copy={common} onSkip={handleIntroSkip} stage={introStage} /> : null}

      <header
        aria-hidden={mapOpen || introBlocksInterface || undefined}
        className="site-header"
        inert={mapOpen || introBlocksInterface || undefined}
      >
        <Link className="brand" href={hrefFor(locale, "home")} onClick={closeOverlays}>
          <span>Eduardo Neto</span>
          <span>latticeknight</span>
        </Link>
        <nav aria-label={common.primaryNavigation} className="desktop-nav">
          {pageSlugs.map((slug) => (
            <Link aria-current={current === slug ? "page" : undefined} href={hrefFor(locale, slug)} key={slug}>
              {common.nav[slug]}
            </Link>
          ))}
        </nav>
        <LanguageSwitch current={current} label={common.language} locale={locale} />
        <button
          aria-controls="lattice-navigation"
          aria-expanded={mapOpen}
          aria-haspopup="dialog"
          className="header-control"
          onClick={() => { setMapOpen(true); setMenuOpen(false); }}
          ref={mapTriggerRef}
          type="button"
        >
          {common.map}
        </button>
        <button
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          className="header-control menu-control"
          onClick={() => { setMenuOpen((value) => !value); setMapOpen(false); }}
          type="button"
        >
          {menuOpen ? common.close : common.menu}
        </button>
      </header>

      <noscript>
        <nav aria-label={common.primaryNavigation} className="no-script-nav">
          {pageSlugs.map((slug) => (
            <a href={hrefFor(locale, slug)} key={slug}>{common.nav[slug]}</a>
          ))}
          <a href={hrefFor(locale === "en" ? "pt" : "en", current)}>
            {locale === "en" ? "PT" : "EN"}
          </a>
        </nav>
      </noscript>

      {menuOpen ? (
        <nav aria-label={common.mobileNavigation} className="mobile-menu" id="mobile-navigation">
          <div>
            {pageSlugs.map((slug) => {
              const isCurrent = current === slug;
              const hasVisited = visited.includes(slug);
              return (
                <Link
                  aria-current={isCurrent ? "page" : undefined}
                  href={hrefFor(locale, slug)}
                  key={slug}
                  onClick={closeOverlays}
                >
                  <span className={`menu-node${isCurrent ? " menu-node--current" : hasVisited ? " menu-node--visited" : ""}`} />
                  <span>{common.nav[slug]}</span>
                  <small>{isCurrent ? common.current : hasVisited ? common.visited : ""}</small>
                </Link>
              );
            })}
            <p>{common.menuHint}</p>
          </div>
        </nav>
      ) : null}

      <main
        aria-hidden={menuOpen || mapOpen || introBlocksInterface || undefined}
        className="page-transition"
        id="main-content"
        inert={menuOpen || mapOpen || introBlocksInterface || undefined}
      >
        {children}
      </main>
      <footer
        aria-hidden={menuOpen || mapOpen || introBlocksInterface || undefined}
        className="site-footer"
        inert={menuOpen || mapOpen || introBlocksInterface || undefined}
      >
        <span>EDUARDO NETO · LATTICEKNIGHT</span>
        <span>
          <a href="https://github.com/latticeknight" target="_blank" rel="noreferrer">GITHUB</a>
          <a href="https://www.linkedin.com/in/eduardo-neto-b71bb36b/" target="_blank" rel="noreferrer">LINKEDIN</a>
        </span>
        <span>{common.footerSystem} · {visited.length} {common.footerExplored}</span>
      </footer>
    </div>
  );
}
