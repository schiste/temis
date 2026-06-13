import {
  definePlugin,
  type ContentHookEvent,
  type ContentPublishStateChangeEvent,
  type PluginContext,
  type RouteContext,
} from "emdash";

const PLUGIN_ID = "temis-cloudflare-deploy";
const PLUGIN_VERSION = "0.1.0";
const PLUGIN_ENTRYPOINT = "@temis/emdash-cloudflare-deploy";
const DEFAULT_DEPLOY_HOOK_ENV_VAR = "TEMIS_PAGES_DEPLOY_HOOK_URL";
const DEFAULT_DEBOUNCE_SECONDS = 30;
const DEPLOY_TASK_NAME = "dispatch-pages-deploy";

interface PendingDeploy {
  count: number;
  collection: string;
  contentId: string | null;
  scheduledFor: string;
  triggerReason: string;
  updatedAt: string;
}

interface LastDispatch {
  dispatchedAt: string;
  ok: boolean;
  responseStatus: number | null;
  triggerReason: string;
  error?: string;
}

export interface CloudflareDeployTriggerOptions {
  debounceSeconds?: number;
  deployHookEnvVar?: string;
}

function getEnv(name: string): string | undefined {
  const importMetaEnv = (
    import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  ).env;
  const processEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  return importMetaEnv?.[name] ?? processEnv?.[name];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function contentId(content: Record<string, unknown>): string | null {
  return asString(content.id);
}

function shouldDeployAfterSave(event: ContentHookEvent): boolean {
  const status = asString(event.content.status);
  if (status === "published") return true;

  return Boolean(
    asString(event.content.publishedAt) ?? asString(event.content.published_at),
  );
}

async function readPending(
  ctx: PluginContext | RouteContext,
): Promise<PendingDeploy | null> {
  const pending = await ctx.kv.get<PendingDeploy>("state:pending-deploy");
  return pending && typeof pending === "object" ? pending : null;
}

async function readLastDispatch(
  ctx: PluginContext | RouteContext,
): Promise<LastDispatch | null> {
  const dispatch = await ctx.kv.get<LastDispatch>("state:last-dispatch");
  return dispatch && typeof dispatch === "object" ? dispatch : null;
}

async function dispatchDeployHook(
  ctx: PluginContext | RouteContext,
  deployHookUrl: string,
  triggerReason: string,
): Promise<LastDispatch> {
  if (!ctx.http) {
    return {
      dispatchedAt: new Date().toISOString(),
      ok: false,
      responseStatus: null,
      triggerReason,
      error: "Plugin does not have network:fetch access.",
    };
  }

  try {
    const response = await ctx.http.fetch(deployHookUrl, { method: "POST" });
    const result: LastDispatch = {
      dispatchedAt: new Date().toISOString(),
      ok: response.ok,
      responseStatus: response.status,
      triggerReason,
      ...(response.ok
        ? {}
        : {
            error: `Cloudflare deploy hook returned HTTP ${response.status}.`,
          }),
    };

    await ctx.kv.set("state:last-dispatch", result);
    return result;
  } catch (err) {
    const result: LastDispatch = {
      dispatchedAt: new Date().toISOString(),
      ok: false,
      responseStatus: null,
      triggerReason,
      error: err instanceof Error ? err.message : String(err),
    };

    await ctx.kv.set("state:last-dispatch", result);
    return result;
  }
}

async function scheduleDeploy(
  ctx: PluginContext,
  deployHookUrl: string,
  debounceSeconds: number,
  collection: string,
  content: Record<string, unknown>,
  triggerReason: string,
): Promise<void> {
  if (!ctx.cron || debounceSeconds <= 0) {
    const result = await dispatchDeployHook(ctx, deployHookUrl, triggerReason);
    if (!result.ok) {
      ctx.log.error(
        "[temis-cloudflare-deploy] Deploy hook dispatch failed.",
        result,
      );
    }
    return;
  }

  const scheduledFor = new Date(
    Date.now() + debounceSeconds * 1000,
  ).toISOString();
  const existing = await readPending(ctx);
  const pending: PendingDeploy = {
    count: (existing?.count ?? 0) + 1,
    collection,
    contentId: contentId(content),
    scheduledFor,
    triggerReason,
    updatedAt: new Date().toISOString(),
  };

  await ctx.kv.set("state:pending-deploy", pending);
  await ctx.cron.schedule(DEPLOY_TASK_NAME, {
    schedule: scheduledFor,
    data: {
      collection,
      contentId: pending.contentId ?? undefined,
      triggerReason,
    },
  });

  ctx.log.info(
    "[temis-cloudflare-deploy] Scheduled Cloudflare Pages deploy.",
    pending,
  );
}

export function createCloudflareDeployTriggerDefinition(
  options: CloudflareDeployTriggerOptions = {},
) {
  const deployHookEnvVar =
    options.deployHookEnvVar ?? DEFAULT_DEPLOY_HOOK_ENV_VAR;
  const debounceSeconds = options.debounceSeconds ?? DEFAULT_DEBOUNCE_SECONDS;

  function deployHookUrl(): string | null {
    return asString(getEnv(deployHookEnvVar));
  }

  async function handleDeployEvent(
    event: ContentHookEvent | ContentPublishStateChangeEvent,
    ctx: PluginContext,
    triggerReason: string,
  ): Promise<void> {
    const hookUrl = deployHookUrl();
    if (!hookUrl) {
      ctx.log.warn(
        "[temis-cloudflare-deploy] Deploy hook URL is not configured.",
        {
          deployHookEnvVar,
          triggerReason,
        },
      );
      return;
    }

    await scheduleDeploy(
      ctx,
      hookUrl,
      debounceSeconds,
      event.collection,
      event.content,
      triggerReason,
    );
  }

  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: ["read:content", "network:fetch"],
    allowedHosts: ["api.cloudflare.com"],
    hooks: {
      "content:afterSave": async (event, ctx) => {
        if (!shouldDeployAfterSave(event)) return;
        await handleDeployEvent(event, ctx, "content:afterSave");
      },
      "content:afterPublish": async (event, ctx) => {
        await handleDeployEvent(event, ctx, "content:afterPublish");
      },
      "content:afterUnpublish": async (event, ctx) => {
        await handleDeployEvent(event, ctx, "content:afterUnpublish");
      },
      cron: async (event, ctx) => {
        if (event.name !== DEPLOY_TASK_NAME) return;

        const hookUrl = deployHookUrl();
        const pending = await readPending(ctx);
        if (!hookUrl) {
          ctx.log.warn(
            "[temis-cloudflare-deploy] Deploy hook URL is not configured.",
            {
              deployHookEnvVar,
            },
          );
          return;
        }

        const triggerReason =
          asString(event.data?.triggerReason) ??
          pending?.triggerReason ??
          "cron:dispatch";
        const result = await dispatchDeployHook(ctx, hookUrl, triggerReason);
        await ctx.kv.delete("state:pending-deploy");

        if (!result.ok) {
          ctx.log.error(
            "[temis-cloudflare-deploy] Deploy hook dispatch failed.",
            result,
          );
        }
      },
    },
    routes: {
      status: {
        handler: async (ctx) => ({
          success: true,
          data: {
            configured: Boolean(deployHookUrl()),
            deployHookEnvVar,
            pending: await readPending(ctx),
            lastDispatch: await readLastDispatch(ctx),
          },
        }),
      },
      dispatch: {
        handler: async (ctx) => {
          if (ctx.request.method !== "POST") {
            return { success: false, error: "Method not allowed. Use POST." };
          }

          const hookUrl = deployHookUrl();
          if (!hookUrl) {
            return {
              success: false,
              error: `Set ${deployHookEnvVar} before dispatching a Cloudflare Pages deploy.`,
            };
          }

          const result = await dispatchDeployHook(
            ctx,
            hookUrl,
            "manual:dispatch",
          );
          return result.ok
            ? { success: true, data: result }
            : { success: false, error: result.error };
        },
      },
    },
  });
}

export function cloudflareDeployTriggerPlugin(
  options: CloudflareDeployTriggerOptions = {},
) {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoint: PLUGIN_ENTRYPOINT,
    options,
  };
}

export function createPlugin(options: CloudflareDeployTriggerOptions = {}) {
  return createCloudflareDeployTriggerDefinition(options);
}

export default cloudflareDeployTriggerPlugin;
