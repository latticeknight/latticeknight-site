import { ExternalProjectLink } from "@/components/external-project-link";
import { OpenMapButton } from "@/components/open-map-button";
import { RouteLink } from "@/components/route-link";
import { StatusDot } from "@/components/status-dot";
import type { Locale, SiteDictionary } from "@/lib/site";

export function HomePage({ locale, copy }: { locale: Locale; copy: SiteDictionary["home"] }) {
  return (
    <div className="page page--home">
      <section className="home-hero">
        <div className="kicker">{copy.kicker}</div>
        <h1 className="home-title">
          <span>{copy.hero[0]}</span>{" "}
          <span>{copy.hero[1]}</span>{" "}
          <span className="home-title-accent">{copy.hero[2]}</span>
        </h1>
        <p className="home-supporting">{copy.supporting}</p>
        <div className="hero-actions">
          <RouteLink className="button button--primary" locale={locale} target="systems">
            {copy.ctas[0]}
          </RouteLink>
          <RouteLink className="button" locale={locale} target="workflows">
            {copy.ctas[1]}
          </RouteLink>
          <RouteLink className="button" locale={locale} target="notes">
            {copy.ctas[2]}
          </RouteLink>
        </div>
      </section>

      <section className="home-card-grid" aria-label={copy.regionLabel}>
        {copy.cards.map((card) => (
          <article className="panel home-card" key={card.title}>
            <div className={`card-label card-label--${card.tone}`}>
              {card.live ? <StatusDot tone={card.tone === "amber" ? "amber" : "cyan"} breathe /> : null}
              {card.label}
            </div>
            <h2>{card.title}</h2>
            {card.website ? <ExternalProjectLink link={card.website} /> : null}
            <p>{card.body}</p>
            <RouteLink locale={locale} target={card.target}>
              {card.link}
            </RouteLink>
          </article>
        ))}
      </section>

      <section className="home-connection">
        <div>
          <div className="section-label">{copy.connectionLabel}</div>
          <p>
            {copy.connectionBody} <OpenMapButton>{copy.mapLink}</OpenMapButton>.
          </p>
        </div>
        <p className="availability">
          {copy.availability}{" "}
          <RouteLink locale={locale} target="contact">
            {copy.contactLink}
          </RouteLink>
          .
        </p>
      </section>
    </div>
  );
}
