import { hasPermission } from "@emdash-cms/auth";
import { defineMiddleware } from "astro:middleware";
import {
  formatContentQualityIssues,
  validateContentQuality,
} from "@temis/content-quality";

interface PublishableLocals {
  emdash?: {
    handleContentGet?: (
      collection: string,
      id: string,
    ) => Promise<{
      data?: unknown;
      error?: { code?: string; message?: string };
      success: boolean;
    }>;
  };
  user?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function contentItemFromResult(result: unknown) {
  if (!isRecord(result)) return null;
  const data = result.data;
  if (!isRecord(data)) return null;
  const item = data.item;
  return isRecord(item) ? item : data;
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

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method !== "POST") return next();

  const target = publishTarget(context.url.pathname);
  if (!target) return next();

  const locals = context.locals as PublishableLocals;
  if (!canPublish(locals.user)) return next();

  const emdash = locals.emdash;
  if (!emdash?.handleContentGet) return next();

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
