import { PageHeader } from "@/components/page-header";
import type { SiteDictionary } from "@/lib/site";

export function WorkflowsPage({ copy }: { copy: SiteDictionary["workflows"] }) {
  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />

      <section className="panel featured-pattern">
        <div className="feature-label">{copy.featureLabel}</div>
        <h2>{copy.featureTitle}</h2>
        <div className="pattern-route" aria-label={copy.featureTitle}>
          {copy.stages.map((stage, index) => (
            <span key={stage}>
              <span className={index === 2 ? "route-chip route-chip--challenge" : "route-chip"}>{stage}</span>
              {index < copy.stages.length - 1 ? <span className="route-arrow">→</span> : null}
            </span>
          ))}
        </div>
        <div className="pattern-fields">
          {copy.fields.map((field, index) => (
            <div key={field.tag}>
              <div className={index === 2 || index > 4 ? "facet-tag facet-tag--amber" : "facet-tag facet-tag--cyan"}>{field.tag}</div>
              <p>{field.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pattern-grid">
        {copy.patterns.map((pattern) => (
          <article className="panel pattern-card" key={pattern.number}>
            <div className="pattern-number">{pattern.number}</div>
            <h2>{pattern.name}</h2>
            <p>{pattern.problem}</p>
            <p className="not-when"><span>{copy.notWhen} · </span>{pattern.notWhen}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
