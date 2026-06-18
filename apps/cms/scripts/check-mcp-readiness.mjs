#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://127.0.0.1:4322";
const REQUIRED_TOOLS = [
  "content_create",
  "content_get",
  "content_publish",
  "content_update",
  "media_list",
  "schema_get_collection",
  "schema_list_collections",
  "search",
  "settings_get",
  "taxonomy_create_term",
  "taxonomy_list",
  "taxonomy_list_terms",
];
const REQUIRED_COLLECTIONS = [
  "initiatives",
  "pages",
  "posts",
  "publications",
  "tools",
];

const args = new Set(process.argv.slice(2));
const requireAuth = args.has("--require-auth");
const checkPublishGuard = args.has("--check-publish-guard");
const baseUrl = process.env.EMDASH_MCP_BASE_URL ?? DEFAULT_BASE_URL;
const token = process.env.EMDASH_MCP_TOKEN ?? "";
const endpoint = new URL("/_emdash/api/mcp", baseUrl);

function log(message) {
  console.log(`[mcp-readiness] ${message}`);
}

function authHeaders() {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function postJson(body, headers = {}) {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...headers,
    },
    method: "POST",
  });

  const text = await response.text();
  return {
    body: parseBody(response, text),
    response,
    text,
  };
}

function parseBody(response, text) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const data = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter(Boolean)
      .at(-1);

    if (!data) return null;
    return JSON.parse(data);
  }

  if (!text.trim()) return null;
  return JSON.parse(text);
}

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

async function rpc(method, params) {
  const { body, response, text } = await postJson(
    {
      id: method,
      jsonrpc: "2.0",
      method,
      params,
    },
    authHeaders(),
  );

  assertOk(
    response.ok,
    `${method} returned HTTP ${response.status}: ${text.slice(0, 500)}`,
  );
  assertOk(!body?.error, `${method} returned ${JSON.stringify(body.error)}`);
  return body?.result;
}

async function callTool(name, toolArgs = {}) {
  const result = await rpc("tools/call", {
    arguments: toolArgs,
    name,
  });

  assertOk(!result?.isError, `${name} failed: ${JSON.stringify(result)}`);
  return parseToolJson(result);
}

function parseToolJson(result) {
  const textBlock = result?.content?.find?.((block) => block.type === "text");
  if (!textBlock?.text) return result;
  return JSON.parse(textBlock.text);
}

function invalidPublishedCreate(id) {
  return {
    id,
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      arguments: {
        collection: "posts",
        data: {},
        status: "published",
      },
      name: "content_create",
    },
  };
}

function assertContentQualityFailure(payload, label) {
  assertOk(payload, `${label} did not return a JSON-RPC payload`);
  assertOk(
    payload.result?._meta?.code === "CONTENT_QUALITY_FAILED",
    `${label} did not return CONTENT_QUALITY_FAILED: ${JSON.stringify(payload)}`,
  );
  assertOk(
    payload.result?.isError === true,
    `${label} did not return an MCP tool error result`,
  );
}

async function checkUnauthenticatedBoundary() {
  const { response } = await postJson({
    id: "unauthenticated-tools-list",
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
  });

  assertOk(
    response.status === 401,
    `expected unauthenticated MCP call to return 401, got ${response.status}`,
  );
  assertOk(
    response.headers.has("www-authenticate"),
    "expected unauthenticated MCP response to advertise bearer auth metadata",
  );
  log("unauthenticated MCP boundary returns 401 with bearer metadata");
}

async function checkAuthenticatedTools() {
  const toolsResult = await rpc("tools/list", {});
  const tools = toolsResult?.tools ?? [];
  const toolNames = new Set(tools.map((tool) => tool.name));
  const missingTools = REQUIRED_TOOLS.filter((tool) => !toolNames.has(tool));

  assertOk(
    missingTools.length === 0,
    `missing required MCP tools: ${missingTools.join(", ")}`,
  );
  log(`authenticated MCP exposes ${tools.length} tools`);

  if (!toolNames.has("content_set_terms")) {
    log(
      "known gap: EmDash MCP does not expose term assignment; use the REST terms API until this is upstreamed or wrapped",
    );
  }

  const schema = await callTool("schema_list_collections");
  const collections = schema.items ?? [];
  const collectionSlugs = new Set(collections.map((item) => item.slug));
  const missingCollections = REQUIRED_COLLECTIONS.filter(
    (slug) => !collectionSlugs.has(slug),
  );

  assertOk(
    missingCollections.length === 0,
    `missing required collections: ${missingCollections.join(", ")}`,
  );
  log(
    `authenticated MCP sees required collections: ${REQUIRED_COLLECTIONS.join(", ")}`,
  );
}

async function checkAuthenticatedPublishGuard() {
  const single = await postJson(
    invalidPublishedCreate("publish-guard-single"),
    authHeaders(),
  );

  assertOk(
    single.response.ok,
    `single publish guard check returned HTTP ${single.response.status}: ${single.text.slice(0, 500)}`,
  );
  assertContentQualityFailure(single.body, "single publish guard check");

  const batch = await postJson(
    [
      invalidPublishedCreate("publish-guard-batch"),
      {
        id: "batch-companion",
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
      },
    ],
    authHeaders(),
  );

  assertOk(
    batch.response.ok,
    `batch publish guard check returned HTTP ${batch.response.status}: ${batch.text.slice(0, 500)}`,
  );
  assertOk(
    Array.isArray(batch.body),
    `batch publish guard check did not return a JSON-RPC batch response: ${batch.text}`,
  );

  const publishPayload = batch.body.find(
    (payload) => payload.id === "publish-guard-batch",
  );
  assertContentQualityFailure(publishPayload, "batch publish guard check");

  const companionPayload = batch.body.find(
    (payload) => payload.id === "batch-companion",
  );
  assertOk(
    companionPayload?.error?.message?.includes("Batch rejected"),
    `batch companion request was not explicitly rejected: ${JSON.stringify(companionPayload)}`,
  );

  log("publish guard blocks invalid single and batched publish writes");
}

try {
  log(`checking ${endpoint.toString()}`);
  await checkUnauthenticatedBoundary();

  if (!token) {
    assertOk(!requireAuth, "set EMDASH_MCP_TOKEN for authenticated MCP checks");
    log("authenticated checks skipped; set EMDASH_MCP_TOKEN to enable them");
    process.exit(0);
  }

  await checkAuthenticatedTools();
  if (checkPublishGuard) await checkAuthenticatedPublishGuard();
  log("MCP readiness checks passed");
} catch (error) {
  console.error(
    `[mcp-readiness] failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
