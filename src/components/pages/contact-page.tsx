import { PageHeader } from "@/components/page-header";
import type { SiteDictionary } from "@/lib/site";

export function ContactPage({ copy }: { copy: SiteDictionary["contact"] }) {
  return (
    <div className="page page--contact">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />
      <section className="contact-routes">
        {copy.routes.map((route) => (
          <a href={`mailto:hello@eduardoneto.com?subject=${encodeURIComponent(route.subject)}`} key={route.name}>
            <span className="contact-node" aria-hidden="true" />
            <span>
              <strong>{route.name}</strong>
              <span>{route.body}</span>
            </span>
            <span className="contact-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </section>
      <p className="contact-note">
        hello@eduardoneto.com · <a href="https://github.com/latticeknight">github</a> ·{" "}
        <a href="https://www.linkedin.com/in/eduardo-neto-b71bb36b/">linkedin</a> · {copy.replyNote}
      </p>
    </div>
  );
}
