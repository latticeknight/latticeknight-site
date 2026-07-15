import { PageHeader } from "@/components/page-header";
import { RouteLink } from "@/components/route-link";
import type { Locale, SiteDictionary } from "@/lib/site";

export function NotesPage({ locale, copy }: { locale: Locale; copy: SiteDictionary["notes"] }) {
  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />
      <div className="category-list" aria-label={copy.categoriesLabel}>
        {copy.categories.map((category) => <span key={category}>{category}</span>)}
      </div>
      <section className="notes-list">
        {copy.items.map((note) => (
          <article className="panel note-card" key={note.title}>
            <div>
              <h2>{note.title}</h2>
              <p>{note.body}</p>
            </div>
            <div className="note-origin">
              <span>{note.category}</span>
              <RouteLink locale={locale} target={note.target}>↳ {note.origin}</RouteLink>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
