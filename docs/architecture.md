# Architecture Notes

TEMIS follows a dynamic-authoring/static-serving model.

## Public Site

The public site is static Astro. It does not query D1, R2, or EmDash at request time. Its production build pulls `/_emdash/api/snapshot` from the CMS, writes the result into `.generated/emdash-snapshot.json`, and renders all published routes into `dist`.

## CMS And Preview

The CMS is an Astro server build with the EmDash integration. In production it uses Cloudflare bindings:

- `DB`: D1 database for content, schemas, users, auth state, and CMS metadata.
- `MEDIA`: R2 bucket for uploaded media.

Draft previews should be served from the CMS/preview Worker, not from the public static Pages domain.

## Publish Flow

1. Editor writes or edits content in EmDash.
2. Editor publishes or unpublishes content.
3. The deploy plugin calls the Cloudflare Pages Deploy Hook.
4. Cloudflare Pages runs `pnpm build`.
5. `apps/site/scripts/pull-snapshot.mjs` fetches the signed published-content snapshot.
6. Astro renders static pages from the snapshot.

## Pending ADR / PRD Inputs

The PRD should define:

- Content collections and fields.
- URL structure.
- SEO model.
- Locale requirements, if any.
- Media rules and image sizes.
- Preview acceptance criteria.
