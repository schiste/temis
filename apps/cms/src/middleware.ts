import { hasPermission } from "@emdash-cms/auth";
import { defineMiddleware } from "astro:middleware";
import {
  formatContentQualityIssues,
  validateContentQuality,
} from "@temis/content-quality";
import {
  contentItemFromResult,
  MCP_ENDPOINT_PATH,
  mcpQualityFailureResponse,
  mcpToolCallFromBody,
  validateMcpPublishCall,
  type ContentGetter,
} from "./mcp-quality";

interface PublishableLocals {
  emdash?: ContentGetter;
  user?: unknown;
}

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

async function readMcpToolCall(request: Request) {
  try {
    return mcpToolCallFromBody(await request.clone().json());
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method !== "POST") return next();

  const locals = context.locals as PublishableLocals;
  if (!canPublish(locals.user)) return next();

  const emdash = locals.emdash;
  if (!emdash?.handleContentGet) return next();

  if (context.url.pathname === MCP_ENDPOINT_PATH) {
    const call = await readMcpToolCall(context.request);
    if (!call) return next();

    const result = await validateMcpPublishCall(call, emdash);
    if (!result || result.errors.length === 0) return next();

    return mcpQualityFailureResponse(call.id, result);
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
