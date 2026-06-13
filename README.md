# TEMIS

TEMIS is a static Astro website whose content is authored in EmDash.

The stack is split into two deployable surfaces:

- `apps/site`: fully static Astro output for Cloudflare Pages.
- `apps/cms`: EmDash admin and preview runtime for Cloudflare Workers, backed by D1 and R2.

Content is published in EmDash, exported as a signed snapshot during the Pages build, and rendered into static HTML by Astro.

The V1 product direction is tracked in [docs/vision.md](./docs/vision.md),
[docs/prd-v1.md](./docs/prd-v1.md), and
[docs/design-system.md](./docs/design-system.md).

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

For the production static build, set `EMDASH_BASE_URL` and `EMDASH_PREVIEW_SECRET`, then run:

```sh
pnpm build
```

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
