# Contributing To TEMIS

TEMIS is a static Astro site with an EmDash CMS surface. This guide covers code,
documentation, local schema work, and local fixture changes.

Production CMS publishing, production content contribution, editorial review,
and contributor access management are intentionally out of scope for now.

## Before You Start

Read these first:

- [README.md](./README.md) for stack overview and local commands.
- [AGENTS.md](./AGENTS.md) for repository-wide engineering rules.
- [docs/prd-v1.md](./docs/prd-v1.md) for V1 product scope.
- [docs/design-system.md](./docs/design-system.md) before changing UI.
- [docs/adr](./docs/adr) before changing architecture or platform behavior.

Use Node.js 22 or newer and pnpm 8 or newer.

## Local Setup

Install dependencies:

```sh
pnpm install
```

Run the static site against the committed starter snapshot:

```sh
pnpm dev:site
```

Run the CMS locally against local SQLite:

```sh
pnpm dev:cms
```

Seed local CMS starter data if needed:

```sh
pnpm seed
```

## Code Contribution Flow

1. Create a focused branch or work on the agreed branch.
2. Make one logical change at a time.
3. Prefer existing package boundaries:
   - `apps/site` for public static rendering.
   - `apps/cms` for EmDash admin/runtime configuration.
   - `packages/design-system` for shared visual primitives and CSS.
   - `packages/graph-navigation` for graph data and graph UI.
   - `packages/tool-github-data` for GitHub repository enrichment.
4. Keep rendering behavior static-first. Public pages must not query production
   D1, R2, or EmDash at request time.
5. Avoid tracking, analytics scripts, cookie banners, or third-party embeds that
   collect reader data.

## Local Content And Schema Changes

Local fixture content may be changed when it supports development, tests, or a
reviewable UI state. Do not treat fixture changes as production publishing.

Published fixture content is checked by the same content quality rules that are
used by the CMS publish middleware:

- title exists
- summary or excerpt exists
- author, person, or byline is linked for posts and tools
- content type is resolvable
- topic, tag, or category assignment exists when the current content model
  exposes one
- SEO title and description exist
- images have alt text, caption, and license or rights note
- tracking embeds and analytics references are absent

Run the content gate after changing seed content, the committed site snapshot,
or content-related CMS behavior:

```sh
pnpm content:check
```

For collection fields, update the native EmDash seed first:

```text
apps/cms/.emdash/seed.json
```

For graph terms, fixture bylines, menu expectations, relationship links, or the
media policy, update:

```text
apps/cms/schema/site.schema.json
```

Then apply and verify locally:

```sh
pnpm cms:schema:apply
pnpm cms:schema:check
```

The schema tooling is additive-only. It may add fields, field metadata, topic
and tag terms, fixture bylines, menu items, missing site options, and
relationship links. It must not delete, rename, or rewrite unrelated editorial
content automatically.

If starter data also needs the new field, update:

```text
apps/cms/.emdash/seed.json
```

## Design Contributions

Follow the design system rather than adding one-off styling:

- Use golden-ratio spacing and typography tokens.
- Keep corners square.
- Keep content aligned to the page grid.
- Use shared components where practical.
- Preserve light default theme and dark theme support.

Run visual checks for layout changes when possible, especially for responsive
header, footer, graph, article, and tool pages.

## Verification

Run the smallest relevant set before committing.

For site-only changes:

```sh
pnpm --filter @temis/site type-check
pnpm --filter @temis/site build:offline
pnpm --filter @temis/site check:graph
```

For CMS changes:

```sh
pnpm --filter @temis/cms type-check
pnpm cms:seed:validate
pnpm cms:schema:check
pnpm content:check
```

For shared package or broad changes:

```sh
pnpm type-check
pnpm build:offline
```

For formatting-sensitive changes:

```sh
pnpm format:check
```

If you skip a relevant check, say which one and why.

## Commit Style

Use granular commits: one logical change per commit.

Good examples:

```text
feat: add tools schema drift management
fix: align media caption above screenshot
docs: add contributor workflow
```

Avoid bundling unrelated docs, UI, schema, and deployment changes in the same
commit.

## What Not To Touch

Do not commit:

- `.env` files or secrets.
- Local SQLite databases.
- Local uploads.
- Generated build output.
- Imported archives unless explicitly requested.
- Temporary screenshots or debug files.

Do not manually edit production D1 or production content as part of ordinary
code contribution. Use tracked schema tooling and maintainer-approved workflows.

## Licensing

Source code is dual-licensed under `MIT OR Apache-2.0`.

Published website content uses `CC BY-SA 4.0`. Production editorial licensing
details will be documented separately when external content contribution opens.
