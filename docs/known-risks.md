# Known Risks

Status: Draft  
Date: 2026-06-13

## Product Risks

- Over-engineering the model before real content and reader behavior exist.
- Topic navigation becoming too dense or abstract to help readers.
- The homepage looking impressive but not making reading obvious enough.
- Public author pages feeling incomplete if person metadata is thin.
- Low reader adoption or weak sharing loops after launch.
- Subscription choices conflicting with the privacy posture.

## Editorial Risks

- Curated publishing creates a team bottleneck.
- Lorem ipsum scaffolding may hide real content layout problems.
- Early topic choices may not match the first real essays and tool announcements.
- Tool announcement articles may drift into product marketing unless editorial rules are clear.
- People records may become inconsistent without profile quality rules.

## Technical Risks

- CMS preview and static public rendering may diverge.
- Publish-triggered rebuilds may fail silently without editor-facing feedback.
- Media handling may become costly or inconsistent without clear image rules.
- Cloudflare bindings and environment variables may be easy to misconfigure.
- Dependency licensing choices may need revision before making the repo public.
- Server/platform metrics may be less expressive than client-side analytics.

## Mitigations

- Keep the V1 schema small.
- Use real content as early as possible.
- Treat unanswered modeling questions as deferred until usage proves they matter.
- Verify publish, preview, and rebuild workflows before visual polish.
- Review service choices for privacy and licensing before public launch.
- Accept less detailed reader analytics to preserve the no-tracking posture.
