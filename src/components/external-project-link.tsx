import type { ExternalSiteLink } from "@/lib/site";

export function ExternalProjectLink({ link }: { link: ExternalSiteLink }) {
  return (
    <a
      className="project-website-link"
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={link.accessibleLabel}
    >
      {link.label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
