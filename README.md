# TEMIS

TEMIS is a static Astro website whose content is authored in EmDash.

The stack is split into two deployable surfaces:

- `apps/site`: fully static Astro output for Cloudflare Pages.
- `apps/cms`: EmDash admin and preview runtime for Cloudflare Workers, backed by D1 and R2.

Content is published in EmDash, exported as a signed snapshot during the Pages build, and rendered into static HTML by Astro.

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

TEMIS application code is proprietary and marked `UNLICENSED`. Third-party
dependencies keep their own licenses; the primary Astro, EmDash, Cloudflare, and
image-processing notices are tracked in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
