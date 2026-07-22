# latticeknight

[![CI](https://github.com/latticeknight/latticeknight-site/actions/workflows/ci.yml/badge.svg)](https://github.com/latticeknight/latticeknight-site/actions/workflows/ci.yml)

The source for my personal website as a software engineer building products, automation, and reliable agentic development workflows.

> The difficult part is no longer generating code.
> It is designing the system around the agents.

This is not a collection of polished case studies detached from the work.
It connects the products I am building with their architecture, operating constraints, experiments, failures, and the methods that emerge from them.

FoundMyPro, Sentinel, workflow patterns, automation boundaries, AI tooling, and field notes all live inside one navigable system rather than separate portfolio pages.

## What the site demonstrates

- Product thinking grounded in real systems, commercial constraints, and failure modes.
- Agentic software development with scoped context, challenge rounds, independent review, and human approval gates.
- A practical automation continuum that distinguishes deterministic scripts from work that genuinely benefits from an agent.
- An experimental record that keeps paused and discarded ideas visible, because deciding when to stop is part of engineering.
- Technical writing connected directly to the products and workflows from which it came.
- A bilingual experience designed for English UK and Portuguese Portugal from the same typed content model.

## Design and implementation

The visual direction began as a Claude Design study and remains in `design_study` as the original handoff and source of truth.

The production application is a modular Next.js implementation rather than a deployment of the exported prototype.
Shared page components, typed content dictionaries, static locale routes, and a persistent application shell make the site straightforward to extend without duplicating each language or page.
Per-locale metadata and dynamically generated OpenGraph share cards give every route a branded lattice preview when links are shared, in English UK or Portuguese Portugal.

The interface is built around one continuous lattice scene that carries the cinematic intro, the ambient background, and the interactive LATTICE navigator without ever rebuilding the graph.
Around it sit route-aware navigation, visit history, interactive role guidance, and a conceptual workflow designer.
These features support the central idea of the site: products, practices, experiments, and writing are parts of one connected engineering system.

The homepage opens with the lattice forming out of darkness, then hands that exact graph off to the dim ambient background it keeps for the rest of the visit.
It plays once per browser session, can be skipped with the skip control or the Escape key, and is suppressed for visitors who prefer reduced motion.
Append `?intro=replay` to the homepage URL to play it again in the same session, or `?intro=off` to skip it entirely.
Once handed off, the ambient graph drifts gently and lights the nodes and connections the pointer passes over, so it stays alive without competing with the page.

Opening LATTICE slides the page content aside and brings that same scene forward as the navigator.
Nodes are drawn toward the pointer and spring back when it leaves, dragging rotates the graph in three dimensions, and the region labels ride along as accessible route links that stay upright and readable.

The About portrait is an opt-in surprise rather than autoplaying decoration.
Activating it expands the portrait over a black backdrop, plays one eight-second pass, then collapses back into the portrait and keeps looping inline until you navigate away or refresh.

## Languages

- English UK at `/en`
- Portuguese Portugal at `/pt`

Every page is available in both languages and the language control preserves the current destination.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The root route redirects to English.

The project does not require environment variables or external services for local development.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs the same checks for every pull request and every push to `main`, followed by a production dependency audit.
`.no-mistakes.yaml` pins those same commands so isolated validation runs stay deterministic.

## Deployment

The site is deployed through Vercel from the public GitHub repository.
Pull requests receive isolated preview deployments before production promotion.
No environment variables or external data services are required.

## Structure

- `src/app/[locale]` contains the statically generated bilingual routes.
- `src/app/[locale]/opengraph-image.tsx` generates the per-locale OpenGraph share card, reused across every page route.
- `src/lib/metadata.ts` centralizes the site name, title suffix, canonical URL, and OpenGraph locale helpers.
- `src/components/pages` contains one modular page implementation per region.
- `src/content` contains the English UK and Portuguese Portugal dictionaries.
- `src/components/site-shell.tsx` owns persistent navigation, language switching, visit history, and lattice-scene state.
- `src/components/lattice-canvas.tsx` owns one continuous lattice scene across the intro, ambient background, and interactive navigation modes.
- `src/components/lattice-intro.tsx` owns the intro overlay copy, skip control, and stage presentation.
- `src/lib/intro-decision.ts` is the single place the play/off rule is evaluated, before first paint, for both the pre-hydration styles and the hydrated canvas.
- `src/components/portrait-video.tsx` owns the opt-in About portrait video surface.
- `public/assets` contains production copies of the supplied brand imagery.
- `design_study` remains the unmodified Claude Design handoff and visual source of truth.

## Project status

The site evolves alongside the work it documents.
Some products are live, some are still being developed, and some experiments are deliberately paused or discarded.
That distinction is part of the story rather than something the portfolio hides.
