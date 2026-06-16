# TEMIS

TEMIS is a static Astro website whose content is authored in EmDash.

The stack is split into two deployable surfaces:

- `apps/site`: fully static Astro output for Cloudflare Pages.
- `apps/cms`: EmDash admin and preview runtime for Cloudflare Workers, backed by D1 and R2.

Content is published in EmDash, exported as a signed snapshot during the Pages build, and rendered into static HTML by Astro.

The V1 product direction is tracked in [docs/vision.md](./docs/vision.md),
[docs/prd-v1.md](./docs/prd-v1.md),
[docs/design-system.md](./docs/design-system.md), and the ADRs in
[docs/adr](./docs/adr).

Contribution guidelines are tracked in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Local Setup

```sh
pnpm install
pnpm dev:cms
pnpm seed
pnpm dev:site
```

For a purely offline static build using the committed starter snapshot:

```sh
pnpm build:offline
```

To mirror the current published production content locally, set the same
`EMDASH_PREVIEW_SECRET` used by the CMS snapshot endpoint, then pull the
production snapshot before starting the static site:

```sh
export EMDASH_PREVIEW_SECRET=replace-with-the-real-secret
pnpm snapshot:pull:production
pnpm dev:site
```

Or run the combined helper:

```sh
export EMDASH_PREVIEW_SECRET=replace-with-the-real-secret
pnpm dev:site:production-content
```

This mirrors production content through the published EmDash snapshot. It does
not give the local static site direct D1 access, which matches the production
static-site architecture.

To mirror the CMS database locally without giving local development write access
to production D1, export production D1 into the local SQLite database:

```sh
pnpm cms:sync:production-replica
pnpm dev:cms
```

Or bring both local surfaces up from production content:

```sh
export EMDASH_PREVIEW_SECRET=replace-with-the-real-secret
pnpm dev:production-replica
```

The replica command uses `wrangler d1 export --remote` as a read-only production
operation, then imports the SQL into `apps/cms/data.db`. Existing local
`data.db` is backed up before replacement. Normal local CMS development still
writes only to SQLite, and local dev does not enable the Pages deploy hook.

For the production static build, set `EMDASH_BASE_URL` and `EMDASH_PREVIEW_SECRET`, then run:

```sh
pnpm build
```

## CMS Schema Management

The V1 schema contract for tool records is tracked in
`apps/cms/schema/tools.schema.json`.

Check local CMS schema drift:

```sh
pnpm cms:schema:check
```

Apply safe additive local changes:

```sh
pnpm cms:schema:apply
```

Check production D1 schema drift:

```sh
pnpm cms:schema:check:production
```

Apply safe additive production changes:

```sh
pnpm cms:schema:apply:production
```

The current schema scripts manage `tools` only. They add or update missing tool
fields and metadata, but they do not delete, rename, or rewrite existing
content. Extra legacy fields are reported as warnings.

## Cloudflare Names

- Pages project: `temis-site`
- CMS Worker: `temis-cms`
- D1 database: `temis-cms-db`
- R2 bucket: `temis-media`

See [Cloudflare setup](./docs/cloudflare.md) for the resource creation and deployment sequence.

## Licensing

TEMIS source code is dual-licensed under `MIT OR Apache-2.0`; see
[LICENSE](./LICENSE), [LICENSE-MIT](./LICENSE-MIT), and
[LICENSE-APACHE](./LICENSE-APACHE).

Published website content will use `CC-BY-SA-4.0`. Third-party dependencies
keep their own licenses; primary notices are tracked in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
