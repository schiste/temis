# EmDash MCP Production Readiness

TEMIS uses the EmDash built-in MCP Streamable HTTP endpoint as the production
agent interface for CMS operations.

Production endpoint:

```text
https://temis-cms.christophe-henner.workers.dev/_emdash/api/mcp
```

Local endpoint:

```text
http://127.0.0.1:4322/_emdash/api/mcp
```

The endpoint is POST-only. Unauthenticated requests must return `401` with
`WWW-Authenticate` metadata. `GET` and `DELETE` are not used because EmDash
runs this endpoint in stateless mode.

## Authentication

Use an EmDash API token or OAuth bearer token:

```text
Authorization: Bearer ec_pat_...
```

EmDash requires bearer-token auth for MCP. Session cookies are accepted by
other authenticated CMS routes but are deliberately rejected by the MCP
endpoint.

Recommended token profiles:

- Read-only agent: `content:read`, `schema:read`, `media:read`,
  `settings:read`.
- Editorial agent: `content:read`, `content:write`, `schema:read`,
  `media:read`, `media:write`.
- Taxonomy maintainer: editorial scopes plus `taxonomies:manage`.
- Menu maintainer: editorial scopes plus `menus:manage`.
- CMS operator: add `schema:write` only when deliberately changing the schema.
- Full admin: reserve `admin` and `settings:manage` for short-lived operator
  sessions.

Role permissions still apply. A token with `content:write` cannot publish if
the associated EmDash user lacks publish permission.

For local development only, EmDash can mint a dev token:

```bash
curl "http://127.0.0.1:4322/_emdash/api/setup/dev-bypass?token"
```

## Content Coverage

EmDash MCP can create, update, publish, unpublish, delete, restore, duplicate,
search, and inspect content in every collection currently present in the CMS
schema. For TEMIS this includes:

- `posts`
- `pages`
- `tools`
- `publications`
- `initiatives`

People are surfaced as first-class public author pages through EmDash
bylines/person data. They are part of content authoring and graph output, even
though they are not currently a generic `people` content collection.

Before an agent writes to any collection, it must call:

1. `schema_list_collections`
2. `schema_get_collection` for the target collection
3. `content_create` as draft
4. `content_update` for SEO, bylines, and final fields
5. `content_publish` only after quality checks pass

Direct `content_create` with `status: "published"` is allowed by EmDash but
should be avoided. TEMIS middleware validates it and will reject incomplete
published content.

## TEMIS Quality Guard

The CMS middleware blocks MCP publish-style calls that fail TEMIS content
quality rules:

- `content_publish`
- `content_update` with `status: "published"`
- `content_create` with `status: "published"`

The guard returns a normal MCP tool result with `isError: true` and
`_meta.code: "CONTENT_QUALITY_FAILED"`. This keeps MCP clients protocol-safe
while making failures deterministic.

The quality gate currently enforces:

- title exists
- summary or excerpt exists
- content type exists
- author/byline exists for authored collections
- SEO title exists
- SEO description exists
- image alt, caption, and license exist when images are used
- source title and content license exist for imported/republished content
- no tracking embeds or analytics references

Missing topic or tag assignment is a warning, not a blocking error, because
EmDash MCP does not yet expose a term-assignment tool.

## Known Gap: Term Assignment

EmDash MCP exposes taxonomy listing and term management, but not assignment of
terms to a content item. TEMIS graph navigation needs these assignments.

Until EmDash adds an MCP tool or TEMIS wraps one, agents must use the existing
REST endpoint after content creation:

```text
POST /_emdash/api/content/{collection}/{id}/terms/{taxonomy}
```

Body:

```json
{
  "termIds": ["01K..."]
}
```

This replaces the full term list for that content item and taxonomy. Resolve
term IDs first with `taxonomy_list_terms` or the REST taxonomy list endpoint.

## Readiness Checks

Local unauthenticated boundary check:

```bash
pnpm cms:mcp:check
```

Authenticated local or custom endpoint check:

```bash
EMDASH_MCP_BASE_URL=http://127.0.0.1:4322 \
  EMDASH_MCP_TOKEN=ec_pat_... \
  pnpm cms:mcp:check:auth
```

Production check:

```bash
EMDASH_MCP_TOKEN=ec_pat_... pnpm cms:mcp:check:production
```

The authenticated check verifies:

- the endpoint is reachable
- unauthenticated access is rejected
- required MCP tools are present
- required TEMIS collections are visible through the schema tools

## Production Operating Rules

- Do not store MCP tokens in git.
- Prefer separate tokens per agent role.
- Prefer draft creation, then update, then publish.
- Use tracked schema scripts before relying on new collections or fields:
  `pnpm cms:schema:check:production` and `pnpm cms:schema:apply:production`.
- Run the static site build after publishing content that should be visible on
  the public site.
- Do not bypass the middleware quality gate for production publishing.
