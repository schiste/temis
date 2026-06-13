# Assumptions

Status: Draft  
Date: 2026-06-13

These assumptions guide V1 implementation until they are replaced by PRD updates or ADRs.

## Product Assumptions

- TEMIS is a codename and may change before launch.
- V1 is a public editorial website for discovery and reading.
- The first audience uses one shared interface.
- Primary reader profiles include funders, operators, curious readers, and future contributors.
- First real content will likely be essays and tool announcement articles.
- Lorem ipsum content is acceptable during scaffolding, but not as launch content.
- Public readers are passive in V1: discover, read, subscribe, and share.
- Public contribution intake is not part of V1.

## Content Assumptions

- Articles are the atomic unit of editorial content in V1.
- Tool announcements are articles, not separate public entities.
- Topics are first-class editorial records.
- Public people are first-class editorial records.
- Articles may reference one or more public people records.
- Topic relationships are manually edited and unlabeled.
- Only published records appear in the public static build.
- Published website content will use `CC-BY-SA-4.0`.

## Technical Assumptions

- The public site is generated statically with Astro.
- EmDash manages content, draft preview, media, admin users, and publishing.
- Cloudflare Pages hosts the public site.
- Cloudflare Workers hosts the CMS and preview surface.
- D1 stores CMS data.
- R2 stores uploaded media.
- Publishing should trigger a static rebuild through a deploy hook.
- The implementation should remain compatible with a future public/open-source repository posture.
- V1 code is intended to be licensed as `MIT OR Apache-2.0`.

## Operating Assumptions

- Prefer open-source dependencies and privacy-aware services.
- Do not add client-side reader tracking, tracking cookies, fingerprinting, or third-party analytics.
- Use server/platform operational signals only for V1 metrics.
- Keep V1 decisions narrow and reversible.
- Document unresolved questions instead of blocking implementation on them.
- Ship a useful V1 quickly, observe real usage, and iterate from evidence.
