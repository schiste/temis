import { hasPermission, hasScope } from "@emdash-cms/auth";
import { defineMiddleware } from "astro:middleware";
import {
  formatContentQualityIssues,
  validateContentQuality,
} from "@temis/content-quality";
import {
  mcpBatchQualityFailureResponse,
  contentItemFromResult,
  MCP_ENDPOINT_PATH,
  mcpQualityFailureResponse,
  mcpToolCallBatchFromBody,
  validateMcpPublishCall,
  type ContentGetter,
  type McpQualityFailure,
  type McpToolCallBatch,
} from "./mcp-quality";
import {
  createCurrentUserToken,
  errorResponse,
  listCurrentUserTokens,
  revokeCurrentUserToken,
} from "./temis-mcp-tokens";

interface PublishableLocals {
  emdash?: ContentGetter;
  tokenScopes?: string[];
  user?: unknown;
}

const MCP_TOKENS_ENDPOINT_PATH = `${MCP_ENDPOINT_PATH}/tokens`;

function publishTarget(pathname: string) {
  const match = pathname.match(
    /^\/_emdash\/api\/content\/([^/]+)\/([^/]+)\/publish\/?$/,
  );
  if (!match) return null;

  return {
    collection: decodeURIComponent(match[1]),
    id: decodeURIComponent(match[2]),
  };
}

function canPublish(user: unknown) {
  const authUser = user as Parameters<typeof hasPermission>[0];
  return (
    hasPermission(authUser, "content:publish_own") ||
    hasPermission(authUser, "content:publish_any")
  );
}

function canUseMcpContentWriteScope(tokenScopes: unknown) {
  if (tokenScopes === undefined) return true;
  return Array.isArray(tokenScopes) && hasScope(tokenScopes, "content:write");
}

async function readMcpToolCallBatch(request: Request) {
  try {
    return mcpToolCallBatchFromBody(await request.clone().json());
  } catch {
    return null;
  }
}

async function mcpPublishFailures(
  batch: McpToolCallBatch,
  emdash: ContentGetter,
) {
  const failures: McpQualityFailure[] = [];

  for (const call of batch.calls) {
    const result = await validateMcpPublishCall(call, emdash);
    if (result && result.errors.length > 0) {
      failures.push({ call, result });
    }
  }

  return failures;
}

function tokenIdFromPath(pathname: string) {
  const match = pathname.match(/^\/_emdash\/api\/mcp\/tokens\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function mcpTokenRouteResponse(request: Request, locals: unknown) {
  const { method } = request;
  const { pathname } = new URL(request.url);

  if (pathname === MCP_TOKENS_ENDPOINT_PATH) {
    if (method === "GET") return listCurrentUserTokens(locals);
    if (method === "POST") {
      try {
        return createCurrentUserToken(locals, await request.json());
      } catch {
        return errorResponse(
          400,
          "INVALID_JSON",
          "Request body must be valid JSON.",
        );
      }
    }
  }

  const tokenId = tokenIdFromPath(pathname);
  if (tokenId && method === "DELETE") {
    return revokeCurrentUserToken(locals, tokenId);
  }

  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const tokenResponse = await mcpTokenRouteResponse(
    context.request,
    context.locals,
  );
  if (tokenResponse) return tokenResponse;

  if (context.request.method !== "POST") return next();

  const locals = context.locals as PublishableLocals;
  if (!canPublish(locals.user)) return next();

  const emdash = locals.emdash;
  if (!emdash?.handleContentGet) return next();

  if (context.url.pathname === MCP_ENDPOINT_PATH) {
    if (!canUseMcpContentWriteScope(locals.tokenScopes)) return next();

    const batch = await readMcpToolCallBatch(context.request);
    if (!batch) return next();

    const failures = await mcpPublishFailures(batch, emdash);
    if (failures.length === 0) return next();

    if (batch.isBatch) return mcpBatchQualityFailureResponse(batch, failures);

    const failure = failures[0];
    return mcpQualityFailureResponse(failure.call.id, failure.result);
  }

  const target = publishTarget(context.url.pathname);
  if (!target) return next();

  const existing = await emdash.handleContentGet(target.collection, target.id);
  if (!existing.success) return next();

  const content = contentItemFromResult(existing);
  if (!content) return next();

  const result = validateContentQuality({
    collection: target.collection,
    content,
    mode: "publish",
  });

  if (result.errors.length === 0) return next();

  return new Response(
    JSON.stringify(
      {
        error: {
          code: "CONTENT_QUALITY_FAILED",
          issues: result.issues,
          message: formatContentQualityIssues(result),
        },
        success: false,
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      status: 422,
    },
  );
});
