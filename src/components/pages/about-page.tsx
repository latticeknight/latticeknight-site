import Image from "next/image";

import { PageHeader } from "@/components/page-header";
import { SocialLinks } from "@/components/social-links";
import type { SiteDictionary } from "@/lib/site";

export function AboutPage({ copy }: { copy: SiteDictionary["about"] }) {
  return (
    <div className="page page--narrow">
      <PageHeader kicker={copy.kicker} title={copy.title} />
      <section className="about-layout">
        <Image
          alt="Eduardo Neto"
          className="portrait"
          height={200}
          priority
          src="/assets/portrait.png"
          width={200}
        />
        <div className="about-copy">
          {copy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p className="about-preference">{copy.preference}</p>
          <SocialLinks />
        </div>
      </section>
    </div>
  );
}
