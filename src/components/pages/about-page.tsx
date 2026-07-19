import { PageHeader } from "@/components/page-header";
import { PortraitVideo } from "@/components/portrait-video";
import { SocialLinks } from "@/components/social-links";
import type { SiteDictionary } from "@/lib/site";

export function AboutPage({ copy }: { copy: SiteDictionary["about"] }) {
  return (
    <div className="page page--narrow">
      <PageHeader kicker={copy.kicker} title={copy.title} />
      <section className="about-layout">
        <PortraitVideo copy={copy} />
        <div className="about-copy">
          {copy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p className="about-preference">{copy.preference}</p>
          <SocialLinks />
        </div>
      </section>
    </div>
  );
}
