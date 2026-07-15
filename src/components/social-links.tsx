import { StatusDot } from "@/components/status-dot";

export function SocialLinks() {
  return (
    <div className="social-links">
      <a href="https://github.com/latticeknight" target="_blank" rel="noreferrer">
        <StatusDot />
        GITHUB
      </a>
      <a
        href="https://www.linkedin.com/in/eduardo-neto-b71bb36b/"
        target="_blank"
        rel="noreferrer"
      >
        <StatusDot />
        LINKEDIN
      </a>
    </div>
  );
}
