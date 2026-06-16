# Media Management

TEMIS V1 treats EmDash media uploaded to Cloudflare R2 as the canonical
production media path.

Checked-in files under `apps/site/public/media/` are allowed only for V1
fixtures, deterministic local builds, and reviewable UI examples. They should
not become the default editorial workflow.

Every published image or screenshot must have:

- alt text
- visible caption or equivalent context
- license or rights note

The content quality gate checks these requirements for known image fields,
including tool screenshots.

For production publishing, upload editorial media through EmDash so the static
site consumes the exported EmDash/R2 URL from the published snapshot.
