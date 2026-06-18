import {
  formatContentQualityIssues,
  isRecord,
  type ContentQualityResult,
  validateContentQuality,
} from "@temis/content-quality";

export const MCP_ENDPOINT_PATH = "/_emdash/api/mcp";

type JsonRpcId = string | number | null;

export interface McpToolCall {
  args: Record<string, unknown>;
  id: JsonRpcId;
  name: string;
}

export interface ContentGetter {
  handleContentGet?: (
    collection: string,
    id: string,
    locale?: string,
  ) => Promise<{
    data?: unknown;
    error?: { code?: string; message?: string };
    success: boolean;
  }>;
}

export function contentItemFromResult(result: unknown) {
  if (!isRecord(result)) return null;
  const data = result.data;
  if (!isRecord(data)) return null;
  const item = data.item;
  return isRecord(item) ? item : data;
}

export function mcpToolCallFromBody(body: unknown): McpToolCall | null {
  if (!isRecord(body)) return null;
  if (body.method !== "tools/call") return null;

  const params = body.params;
  if (!isRecord(params)) return null;

  const name = params.name;
  const args = params.arguments;
  if (typeof name !== "string" || !isRecord(args)) return null;

  const id =
    typeof body.id === "string" ||
    typeof body.id === "number" ||
    body.id === null
      ? body.id
      : null;

  return { args, id, name };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function mergeContentForPublish(
  existing: Record<string, unknown>,
  args: Record<string, unknown>,
) {
  const data = isRecord(args.data) ? args.data : {};
  const merged: Record<string, unknown> = {
    ...existing,
    ...data,
    status: "published",
  };

  const slug = stringValue(args.slug);
  if (slug) merged.slug = slug;

  if (args.seo !== undefined) merged.seo = args.seo;
  if (args.bylines !== undefined) merged.bylines = args.bylines;
  if (args.publishedAt !== undefined) merged.publishedAt = args.publishedAt;

  return merged;
}

export async function validateMcpPublishCall(
  call: McpToolCall,
  emdash: ContentGetter,
): Promise<ContentQualityResult | null> {
  if (!emdash.handleContentGet) return null;

  if (call.name === "content_create" && call.args.status === "published") {
    const collection = stringValue(call.args.collection);
    if (!collection) return null;

    const content = {
      ...(isRecord(call.args.data) ? call.args.data : {}),
      ...(stringValue(call.args.slug)
        ? { slug: stringValue(call.args.slug) }
        : {}),
      status: "published",
    };

    return validateContentQuality({
      collection,
      content,
      mode: "publish",
    });
  }

  if (call.name !== "content_publish" && call.name !== "content_update") {
    return null;
  }

  if (call.name === "content_update" && call.args.status !== "published") {
    return null;
  }

  const collection = stringValue(call.args.collection);
  const id = stringValue(call.args.id);
  if (!collection || !id) return null;

  const locale = stringValue(call.args.locale) ?? undefined;
  const existing = await emdash.handleContentGet(collection, id, locale);
  if (!existing.success) return null;

  const existingContent = contentItemFromResult(existing);
  if (!existingContent) return null;

  const content =
    call.name === "content_update"
      ? mergeContentForPublish(existingContent, call.args)
      : existingContent;

  return validateContentQuality({
    collection,
    content,
    mode: "publish",
  });
}

export function mcpQualityFailureResponse(
  id: JsonRpcId,
  result: ContentQualityResult,
) {
  return new Response(
    JSON.stringify(
      {
        jsonrpc: "2.0",
        id,
        result: {
          _meta: {
            code: "CONTENT_QUALITY_FAILED",
            issues: result.issues,
          },
          content: [
            {
              text: `[CONTENT_QUALITY_FAILED]\n${formatContentQualityIssues(
                result,
              )}`,
              type: "text",
            },
          ],
          isError: true,
        },
      },
      null,
      2,
    ),
    {
      headers: {
        "cache-control": "private, no-store",
        "content-type": "application/json; charset=utf-8",
      },
      status: 200,
    },
  );
}
