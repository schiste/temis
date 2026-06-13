# Cloudflare Setup

This repo is prepared for Cloudflare-first deployment:

- Cloudflare Pages hosts `apps/site/dist`.
- Cloudflare Workers runs `apps/cms`.
- D1 stores EmDash content and auth state.
- R2 stores uploaded media.
- A Pages Deploy Hook lets EmDash trigger static rebuilds after publish events.

## Resource Names

Use the TEMIS codename consistently:

- Pages project: `temis-site`
- Worker: `temis-cms`
- D1 database: `temis-cms-db`
- R2 bucket: `temis-media`

## Provisioning Sequence

1. Create the D1 database.

   ```sh
   pnpm wrangler d1 create temis-cms-db
   ```

   Paste the returned `database_id` into `apps/cms/wrangler.jsonc`.

2. Create the R2 media bucket.

   ```sh
   pnpm wrangler r2 bucket create temis-media
   ```

3. Create a Cloudflare Pages project named `temis-site`.

   Build settings:

   - Build command: `pnpm build`
   - Build output directory: `apps/site/dist`
   - Root directory: repository root

4. Add Pages environment variables:

   - `EMDASH_BASE_URL`: CMS/preview URL, for example `https://preview.url.com`
   - `EMDASH_PREVIEW_SECRET`: same secret as the CMS Worker
   - `TEMIS_PUBLIC_SITE_URL`: production URL, for example `https://url.com`

5. Add a Pages Deploy Hook for the production branch.

   Store that hook URL as the CMS Worker secret `TEMIS_PAGES_DEPLOY_HOOK_URL`.

6. Add CMS Worker secrets.

   ```sh
   pnpm --filter @temis/cms wrangler secret put EMDASH_PREVIEW_SECRET
   pnpm --filter @temis/cms wrangler secret put TEMIS_PAGES_DEPLOY_HOOK_URL
   ```

7. Deploy the CMS Worker.

   ```sh
   pnpm deploy:cms
   ```

8. Seed the CMS locally first during development.

   ```sh
   pnpm seed
   ```

## Domains

The repo deliberately starts without final custom routes. Attach domains after the first successful deployments:

- `url.com` and `www.url.com` to the Pages project.
- `preview.url.com` to the CMS Worker.

Keeping preview on a subdomain avoids asset collisions between the static public Astro build and the server-rendered CMS/preview Astro build.
