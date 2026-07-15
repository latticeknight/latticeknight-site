import { PageHeader } from "@/components/page-header";
import { StatusDot } from "@/components/status-dot";
import type { SiteDictionary } from "@/lib/site";

export function LabPage({ copy }: { copy: SiteDictionary["lab"] }) {
  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />
      <section className="lab-grid">
        {copy.items.map((item) => (
          <article className={item.discarded ? "panel lab-card lab-card--discarded" : "panel lab-card"} key={item.name}>
            <div className={`lab-status lab-status--${item.tone}`}><StatusDot tone={item.tone} />{item.status}</div>
            <h2>{item.name}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
