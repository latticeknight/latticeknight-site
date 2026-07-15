import { PageHeader } from "@/components/page-header";
import { StatusDot } from "@/components/status-dot";
import type { SiteDictionary } from "@/lib/site";

function FacetGrid({ facets, tone }: { facets: Array<{ tag: string; body: string }>; tone: "cyan" | "amber" }) {
  return (
    <div className="facet-grid">
      {facets.map((facet) => (
        <article className="facet" key={facet.tag}>
          <div className={`facet-tag facet-tag--${tone}`}>{facet.tag}</div>
          <p>{facet.body}</p>
        </article>
      ))}
    </div>
  );
}

export function SystemsPage({ copy }: { copy: SiteDictionary["systems"] }) {
  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />

      <div className="status-legend" aria-label={copy.legendLabel}>
        <span><StatusDot />{copy.legend[0]}</span>
        <span><StatusDot tone="amber" />{copy.legend[1]}</span>
        <span><StatusDot tone="muted" />{copy.legend[2]}</span>
        <span><StatusDot tone="muted" outline />{copy.legend[3]}</span>
      </div>

      <section className="panel system-panel">
        <div className="system-status system-status--cyan"><StatusDot breathe />{copy.foundMyPro.status}</div>
        <h2>FoundMyPro</h2>
        <p className="system-intro">{copy.foundMyPro.intro}</p>
        <FacetGrid facets={copy.foundMyPro.facets} tone="cyan" />
        <div className="system-footnotes">
          {[copy.foundMyPro.openQuestions, copy.foundMyPro.lessons].map((item) => (
            <div key={item.title}>
              <div className="facet-tag facet-tag--amber">{item.title}</div>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel system-panel">
        <div className="system-status system-status--amber"><StatusDot tone="amber" breathe />{copy.sentinel.status}</div>
        <h2>Sentinel for Sentry</h2>
        <p className="system-intro">{copy.sentinel.intro}</p>
        <FacetGrid facets={copy.sentinel.facets} tone="amber" />
      </section>

      <p className="honesty-note">{copy.honesty}</p>
    </div>
  );
}
