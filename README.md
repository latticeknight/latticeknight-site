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

The interface includes an ambient canvas lattice, route-aware navigation, visit history, an interactive navigation lattice, interactive role guidance, and a conceptual workflow designer.
These features support the central idea of the site: products, practices, experiments, and writing are parts of one connected engineering system.

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

GitHub Actions runs the same checks for every push and pull request, followed by a production dependency audit.

## Deployment

The site is deployed through Vercel from the public GitHub repository.
Pull requests receive isolated preview deployments before production promotion.
No environment variables or external data services are required.

## Structure

- `src/app/[locale]` contains the statically generated bilingual routes.
- `src/components/pages` contains one modular page implementation per region.
- `src/content` contains the English UK and Portuguese Portugal dictionaries.
- `src/components/site-shell.tsx` owns persistent navigation, language switching, visit history, and the interactive lattice.
- `src/components/lattice-canvas.tsx` owns the ambient connected graph.
- `public/assets` contains production copies of the supplied brand imagery.
- `design_study` remains the unmodified Claude Design handoff and visual source of truth.

## Project status

The site evolves alongside the work it documents.
Some products are live, some are still being developed, and some experiments are deliberately paused or discarded.
That distinction is part of the story rather than something the portfolio hides.
