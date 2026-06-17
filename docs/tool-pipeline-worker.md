# TEMIS Tool Pipeline Worker

The tool pipeline Worker keeps GitHub-derived metadata for first-class tool
records fresh in EmDash D1.

## Purpose

When a tool has a `repository_url`, the Worker fetches public GitHub metadata
and stores the derived payload on the tool record:

- `github_data`
- `github_synced_at`
- `github_sync_error`

The static site reads `github_data` first and only falls back to build-time
GitHub fetching when persisted metadata is missing and fetching is not disabled.

## Runtime

Worker app:

```sh
apps/tool-pipeline
```

Cloudflare Worker name:

```sh
temis-tool-pipeline
```

Bound D1 database:

```sh
temis-cms-db
```

Cron schedule:

```sh
17 */6 * * *
```

This runs every six hours. It scans tools with a non-empty `repository_url`.

## Secrets

Set secrets on the `temis-tool-pipeline` Worker:

```sh
pnpm --filter @temis/tool-pipeline wrangler secret put TEMIS_TOOL_PIPELINE_TOKEN
pnpm --filter @temis/tool-pipeline wrangler secret put TEMIS_PAGES_DEPLOY_HOOK_URL
pnpm --filter @temis/tool-pipeline wrangler secret put TEMIS_GITHUB_TOKEN
```

`TEMIS_TOOL_PIPELINE_TOKEN` protects manual runs.

`TEMIS_PAGES_DEPLOY_HOOK_URL` is optional but recommended. When configured, the
Worker calls the Pages deploy hook only if at least one tool receives changed
GitHub metadata.

`TEMIS_GITHUB_TOKEN` is optional for public repositories, but recommended to
avoid low unauthenticated GitHub API limits.

## Manual Run

```sh
curl -X POST \
  -H "Authorization: Bearer $TEMIS_TOOL_PIPELINE_TOKEN" \
  "https://temis-tool-pipeline.<account>.workers.dev/run"
```

Useful query parameters:

- `limit=10`: cap the number of tool records scanned.
- `deploy=0`: update D1 without calling the Pages deploy hook.

Health check:

```sh
curl "https://temis-tool-pipeline.<account>.workers.dev/health"
```

## Deployment

Apply the tracked EmDash schema before deploying or running the Worker:

```sh
pnpm cms:schema:apply
pnpm cms:schema:apply:production
```

Deploy the Worker:

```sh
pnpm deploy:tool-pipeline
```

Regenerate Worker binding/runtime types after editing `wrangler.jsonc`:

```sh
pnpm --filter @temis/tool-pipeline run types:generate
```

The generated `apps/tool-pipeline/src/worker-configuration.d.ts` file is local
build output and is intentionally ignored by git.

## Notes

- Editorial fields remain team-managed in EmDash.
- Pipeline fields are derived data and should not be edited by hand.
- Failed GitHub requests set `github_sync_error` but do not trigger a static
  rebuild.
- Routine unchanged checks do not update the tool row and do not trigger a
  static rebuild.
