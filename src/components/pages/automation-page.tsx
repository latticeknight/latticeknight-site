import { PageHeader } from "@/components/page-header";
import type { SiteDictionary } from "@/lib/site";

export function AutomationPage({ copy }: { copy: SiteDictionary["automation"] }) {
  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />

      <section className="continuum">
        {copy.continuum.map((step, index) => (
          <article key={step.label}>
            <div className={`continuum-label continuum-label--${index}`}>{step.label}</div>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section className="automation-grid">
        {copy.items.map((item) => (
          <article className="automation-card" key={item.name}>
            <div className="automation-card-heading">
              <h2>{item.name}</h2>
              <span>{item.tier}</span>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
