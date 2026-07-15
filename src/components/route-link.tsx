import Link from "next/link";

import { hrefFor, type Locale, type PageSlug } from "@/lib/site";

export function RouteLink({
  locale,
  target,
  children,
  className,
}: {
  locale: Locale;
  target: PageSlug;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link className={className} href={hrefFor(locale, target)}>
      {children}
    </Link>
  );
}
