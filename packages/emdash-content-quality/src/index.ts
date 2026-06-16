import {
  definePlugin,
  type ContentHookEvent,
  type ContentPublishStateChangeEvent,
  type PluginContext,
} from "emdash";
import {
  formatContentQualityIssues,
  validateContentQuality,
} from "@temis/content-quality";

const PLUGIN_ID = "temis-content-quality";
const PLUGIN_VERSION = "0.1.0";
const PLUGIN_ENTRYPOINT = "@temis/emdash-content-quality";

function validateNoTracking(event: ContentHookEvent) {
  const result = validateContentQuality({
    collection: event.collection,
    content: event.content,
    mode: "draft",
  });

  const trackingErrors = result.errors.filter(
    (issue) => issue.code === "tracking-embed",
  );
  if (trackingErrors.length === 0) return;

  throw new Error(
    formatContentQualityIssues({
      ...result,
      errors: trackingErrors,
      issues: trackingErrors,
      warnings: [],
    }),
  );
}

function logPublishedQuality(
  event: ContentPublishStateChangeEvent,
  ctx: PluginContext,
) {
  const result = validateContentQuality({
    collection: event.collection,
    content: event.content,
    mode: "publish",
  });

  if (result.errors.length === 0 && result.warnings.length === 0) return;

  const logPayload = {
    collection: result.collection,
    contentId: result.contentId,
    issues: result.issues,
  };

  if (result.errors.length > 0) {
    ctx.log.error(
      "[temis-content-quality] Published content failed quality checks.",
      logPayload,
    );
    return;
  }

  ctx.log.warn(
    "[temis-content-quality] Published content has quality warnings.",
    logPayload,
  );
}

export function createContentQualityDefinition() {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: ["content:write"],
    hooks: {
      "content:beforeSave": {
        errorPolicy: "abort",
        handler: async (event) => {
          validateNoTracking(event);
        },
      },
      "content:afterPublish": async (event, ctx) => {
        logPublishedQuality(event, ctx);
      },
    },
  });
}

export function contentQualityPlugin() {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoint: PLUGIN_ENTRYPOINT,
  };
}

export function createPlugin() {
  return createContentQualityDefinition();
}

export default contentQualityPlugin;
