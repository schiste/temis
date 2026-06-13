# TEMIS Initial Platform Deployment Plan

Status: Draft  
Date: 2026-06-13  
Scope: V1 platform bootstrap

## Goal

Deploy the first TEMIS V1 platform on Cloudflare with:

- Public static Astro site on Cloudflare Pages.
- EmDash CMS and draft preview on Cloudflare Workers.
- CMS/content/auth state in Cloudflare D1.
- Media uploads in Cloudflare R2.
- EmDash publish events triggering Cloudflare Pages rebuilds through a deploy hook.

This plan is for the initial technical deployment. It does not include final visual design, final domain naming, newsletter delivery, Wikimedia talk-page delivery, public submissions, or analytics beyond Cloudflare server/platform signals.

## Target Resources

Use the TEMIS codename consistently:

- Pages project: `temis-site`
- CMS Worker: `temis-cms`
- D1 database: `temis-cms-db`
- R2 bucket: `temis-media`
- Deploy hook Worker secret: `TEMIS_PAGES_DEPLOY_HOOK_URL`

Initial URLs:

- Public site: Cloudflare Pages default URL first.
- CMS/admin/preview: Workers default URL first.
- Final public and CMS domains are attached after the first successful deployment.

## Deployment Shape

### Public Site

The public site is static. It is built by Cloudflare Pages from the repo root.

Build settings:

- Production branch: `main`
- Build command: `pnpm build`
- Build output directory: `apps/site/dist`
- Root directory: repository root
- Preview-per-branch deployments: disabled/not used for V1

The production build runs `apps/site/scripts/pull-snapshot.mjs`, fetches the signed EmDash snapshot from the CMS, and renders published content into static HTML.

### CMS And Preview

The CMS runs as the `temis-cms` Worker from `apps/cms`.

The CMS owns:

- EmDash admin UI.
- Draft preview.
- Snapshot API consumed by the static site build.
- D1 binding `DB`.
- R2 binding `MEDIA`.
- EmDash authentication and editorial roles.

### Publish Rebuild Flow

1. Editor publishes or unpublishes content in EmDash.
2. The TEMIS Cloudflare deploy plugin calls the Pages deploy hook.
3. Cloudflare Pages runs `pnpm build`.
4. The static build fetches the published snapshot from the CMS.
5. Cloudflare Pages serves the rebuilt static site.

## Phase 0: Preflight

Before provisioning Cloudflare resources:

1. Push the current `main` branch to GitHub so Cloudflare Pages can build the latest repo state.
2. Confirm Wrangler is authenticated:

   ```sh
   pnpm wrangler whoami
   ```

3. Confirm local verification passes:

   ```sh
   pnpm format:check
   pnpm type-check
   pnpm build:offline
   pnpm build:cms
   ```

4. Generate one long `EMDASH_PREVIEW_SECRET` and keep it out of git:

   ```sh
   openssl rand -base64 48
   ```

5. Confirm the first admin email remains:

   ```txt
   christophe.henner@gmail.com
   ```

## Phase 1: Provision Cloudflare Storage

Create the D1 database:

```sh
pnpm wrangler d1 create temis-cms-db
```

Then copy the returned `database_id` into `apps/cms/wrangler.jsonc` under the `DB` binding. The database ID is not a secret and should be committed.

Create the R2 media bucket:

```sh
pnpm wrangler r2 bucket create temis-media
```

Expected result:

- `apps/cms/wrangler.jsonc` points at the real D1 database.
- The `MEDIA` binding points at `temis-media`.
- No production secrets have been committed.

## Phase 2: Deploy The CMS Worker First

The CMS should be deployed before Pages so the static site has a snapshot endpoint.

Set Worker secrets:

```sh
pnpm --filter @temis/cms wrangler secret put EMDASH_PREVIEW_SECRET
pnpm --filter @temis/cms wrangler secret put TEMIS_INITIAL_ADMIN_EMAIL
```

Deploy the Worker:

```sh
pnpm deploy:cms
```

Expected result:

- `temis-cms` is reachable on the Workers default domain.
- `/` redirects to `/_emdash/admin`.
- `/_emdash/api/snapshot` can be reached by the static build when signed with `EMDASH_PREVIEW_SECRET`.
- The CMS can see `DB` and `MEDIA` bindings.

Do not configure `TEMIS_PAGES_DEPLOY_HOOK_URL` yet; the Pages project does not exist at this point.

## Phase 3: Initialize CMS Data And Admin Access

Open the CMS admin URL and verify the EmDash authentication flow.

Minimum checks:

- Initial admin access works for `christophe.henner@gmail.com`.
- Admin/editor roles are available.
- The CMS can create draft article, topic, and person records.
- Draft preview works from the CMS/Worker surface.
- Published-only snapshot excludes drafts.

Open implementation point:

- The current repo has `pnpm seed` for local development, but the exact production D1 initialization/seed workflow should be verified during this phase. If EmDash requires a remote seed or migration command, document it before adding real editorial content.

## Phase 4: Create Cloudflare Pages Project

Create the `temis-site` Pages project and connect it to the GitHub repository.

Configure:

- Production branch: `main`
- Build command: `pnpm build`
- Build output directory: `apps/site/dist`
- Root directory: repository root
- Platform-native builds only; no GitHub Actions build pipeline for V1.
- No per-branch preview deployment workflow for V1.

Add Pages environment variables:

```txt
EMDASH_BASE_URL=<CMS Worker URL>
EMDASH_PREVIEW_SECRET=<same secret as CMS Worker>
EMDASH_PREVIEW_SOURCE=temis-static-build
TEMIS_PUBLIC_SITE_URL=<Pages production URL or final domain>
```

Trigger the first Pages deployment.

Expected result:

- Pages build succeeds.
- `apps/site/scripts/pull-snapshot.mjs` fetches a valid EmDash snapshot.
- Public static pages render from published CMS content only.

## Phase 5: Wire Publish-To-Rebuild

Create a production deploy hook in the `temis-site` Pages project.

Store the hook URL as a CMS Worker secret:

```sh
pnpm --filter @temis/cms wrangler secret put TEMIS_PAGES_DEPLOY_HOOK_URL
```

Redeploy or verify the Worker if Wrangler does not make the secret active immediately:

```sh
pnpm deploy:cms
```

Publish a test article in EmDash.

Expected result:

- The deploy plugin calls the Pages deploy hook.
- Cloudflare Pages starts a new production build.
- The newly published content appears on the public static site after the build.
- Unpublished/draft content remains absent from the public site.

## Phase 6: Attach Domains

Initial deployment should use Cloudflare default URLs. Attach custom domains only after the default deployment path is verified.

Recommended V1 domain shape:

- Public site: final apex/root domain and `www` on Cloudflare Pages.
- CMS/admin/preview: dedicated subdomain on the CMS Worker, for example `preview.<domain>`.

The earlier `/_emdash` path idea can be revisited later. Starting with a CMS subdomain avoids route conflicts between Pages static assets and the Worker admin/preview runtime.

After domains are attached, update environment variables:

- Pages `TEMIS_PUBLIC_SITE_URL`
- Pages `EMDASH_BASE_URL`
- CMS `TEMIS_CMS_SITE_URL`

Then redeploy both surfaces.

## Phase 7: Smoke Test

Run a full editorial smoke test:

1. Log in to the CMS as admin.
2. Create or edit a topic.
3. Create a draft article assigned to that topic.
4. Confirm the draft is previewable in the CMS.
5. Confirm the draft is absent from the public site.
6. Publish the article.
7. Confirm a Pages build starts from the deploy hook.
8. Confirm the published article appears on the public site.
9. Upload a media asset and confirm R2-backed media works.
10. Unpublish the article.
11. Confirm another Pages build starts.
12. Confirm the unpublished article disappears from the public site.

## Phase 8: Operational Baseline

For V1, use Cloudflare-native operational signals only.

Required checks:

- Pages deployment history and build logs.
- Worker invocation/error logs.
- Worker tail during smoke tests:

  ```sh
  pnpm --filter @temis/cms wrangler tail
  ```

- D1 database existence and backup/export procedure.
- R2 bucket object visibility and access rules.
- Cloudflare request counts, status codes, bandwidth, and cache behavior.

Do not add client-side analytics, tracking cookies, fingerprinting, or third-party reader analytics.

## Rollback Plan

If the public site build is bad:

- Roll back to a previous Cloudflare Pages deployment.
- Fix content or code.
- Trigger a fresh Pages deployment.

If the CMS Worker deployment is bad:

- Roll back to a previous Worker version.
- Re-run `pnpm deploy:cms` after the fix.

If content data is damaged:

- Use D1 export/time-travel options where available.
- Do not perform destructive production D1 changes without a fresh export.

If media is damaged:

- Treat R2 as source media storage.
- Avoid overwriting objects destructively until media naming/versioning rules are finalized.

## Open Deployment Questions

- What is the final public domain?
- Should the CMS use a subdomain for all of V1, or should `/_emdash` routing be implemented later?
- What exact production D1 initialization/seed command does EmDash require?
- Should Cloudflare Pages build notifications go only to the account owner, or to a shared operational address?
- Should D1 exports be manual before schema/content model changes, or scheduled once real content exists?

## First Deployment Checklist

- [ ] Current `main` pushed to GitHub.
- [ ] Wrangler authentication confirmed.
- [ ] `pnpm format:check` passes.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm build:offline` passes.
- [ ] `pnpm build:cms` passes.
- [ ] D1 database created.
- [ ] D1 database ID committed in `apps/cms/wrangler.jsonc`.
- [ ] R2 bucket created.
- [ ] CMS Worker secrets set.
- [ ] CMS Worker deployed.
- [ ] CMS admin access verified.
- [ ] Production CMS data initialization verified.
- [ ] Pages project created.
- [ ] Pages environment variables set.
- [ ] First Pages deployment passes.
- [ ] Pages deploy hook created.
- [ ] CMS deploy hook secret set.
- [ ] Publish-triggered rebuild verified.
- [ ] Public/draft content separation verified.
- [ ] Media upload/render verified.
- [ ] Cloudflare operational signals checked.
