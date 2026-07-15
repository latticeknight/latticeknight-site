export function StatusDot({
  tone = "cyan",
  outline = false,
  breathe = false,
}: {
  tone?: "cyan" | "amber" | "muted";
  outline?: boolean;
  breathe?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`status-dot status-dot--${tone}${outline ? " status-dot--outline" : ""}${breathe ? " status-dot--breathe" : ""}`}
    />
  );
}
