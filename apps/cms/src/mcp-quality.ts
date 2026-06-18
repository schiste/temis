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
  index: number;
  name: string;
}

export interface McpJsonRpcMessage {
  call: McpToolCall | null;
  hasId: boolean;
  id: JsonRpcId;
  index: number;
}

export interface McpToolCallBatch {
  calls: McpToolCall[];
  isBatch: boolean;
  messages: McpJsonRpcMessage[];
}

export interface McpQualityFailure {
  call: McpToolCall;
  result: ContentQualityResult;
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

function jsonRpcIdFromMessage(message: Record<string, unknown>) {
  const id = message.id;
  return typeof id === "string" || typeof id === "number" || id === null
    ? id
    : null;
}

function mcpMessageFromBody(
  message: unknown,
  index: number,
): McpJsonRpcMessage {
  if (!isRecord(message)) {
    return { call: null, hasId: false, id: null, index };
  }

  const hasId = Object.hasOwn(message, "id");
  const id = jsonRpcIdFromMessage(message);

  if (message.method !== "tools/call") {
    return { call: null, hasId, id, index };
  }

  const params = message.params;
  if (!isRecord(params)) return { call: null, hasId, id, index };

  const name = params.name;
  const args = params.arguments;
  if (typeof name !== "string" || !isRecord(args)) {
    return { call: null, hasId, id, index };
  }

  return {
    call: { args, id, index, name },
    hasId,
    id,
    index,
  };
}

export function mcpToolCallBatchFromBody(
  body: unknown,
): McpToolCallBatch | null {
  const isBatch = Array.isArray(body);
  const rawMessages = isBatch ? body : [body];
  const messages = rawMessages.map(mcpMessageFromBody);
  const calls = messages
    .map((message) => message.call)
    .filter((call): call is McpToolCall => Boolean(call));

  if (calls.length === 0) return null;
  return { calls, isBatch, messages };
}

export function mcpToolCallFromBody(body: unknown): McpToolCall | null {
  return mcpToolCallBatchFromBody(body)?.calls[0] ?? null;
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

  if (args.seo === null) {
    merged.seo = null;
  } else if (isRecord(args.seo)) {
    merged.seo = {
      ...(isRecord(existing.seo) ? existing.seo : {}),
      ...args.seo,
    };
  } else if (args.seo !== undefined) {
    merged.seo = args.seo;
  }

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

function mcpQualityFailurePayload(id: JsonRpcId, result: ContentQualityResult) {
  return {
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
  };
}

function mcpBatchRejectedPayload(id: JsonRpcId) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message:
        "Batch rejected because at least one publish operation failed TEMIS content quality checks. Submit publish writes individually after fixing the reported issue.",
    },
  };
}

export function mcpQualityFailureResponse(
  id: JsonRpcId,
  result: ContentQualityResult,
) {
  return new Response(
    JSON.stringify(mcpQualityFailurePayload(id, result), null, 2),
    {
      headers: {
        "cache-control": "private, no-store",
        "content-type": "application/json; charset=utf-8",
      },
      status: 200,
    },
  );
}

export function mcpBatchQualityFailureResponse(
  batch: McpToolCallBatch,
  failures: McpQualityFailure[],
) {
  const failuresByIndex = new Map(
    failures.map((failure) => [failure.call.index, failure.result]),
  );
  const responses = batch.messages
    .filter((message) => message.hasId)
    .map((message) => {
      const failure = failuresByIndex.get(message.index);
      return failure
        ? mcpQualityFailurePayload(message.id, failure)
        : mcpBatchRejectedPayload(message.id);
    });

  if (responses.length === 0) {
    return new Response(null, {
      headers: {
        "cache-control": "private, no-store",
      },
      status: 204,
    });
  }

  return new Response(JSON.stringify(responses, null, 2), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    },
    status: 200,
  });
}
