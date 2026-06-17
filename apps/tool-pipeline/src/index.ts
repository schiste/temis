import {
  fetchToolGithubData,
  type ToolGithubData,
} from "@temis/tool-github-data";

type PipelineEnv = Cloudflare.Env & {
  TEMIS_GITHUB_TOKEN?: string;
  TEMIS_PAGES_DEPLOY_HOOK_URL?: string;
  TEMIS_TOOL_PIPELINE_TOKEN?: string;
};

interface ToolRow {
  github_data: string | null;
  github_sync_error: string | null;
  id: string;
  repository_url: string | null;
  slug: string | null;
  title: string | null;
}

interface ToolSyncResult {
  error?: string;
  id: string;
  repositoryUrl: string;
  slug: string;
  status: "changed" | "error" | "skipped" | "unchanged";
}

interface DeployResult {
  configured: boolean;
  ok?: boolean;
  status?: number;
}

interface PipelineResult {
  changed: number;
  deploy: DeployResult | null;
  errors: number;
  scanned: number;
  tools: ToolSyncResult[];
  trigger: string;
  unchanged: number;
}

const defaultLimit = 50;
const maxLimit = 100;
const textEncoder = new TextEncoder();

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function resolveLimit(value: string | null | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

function configuredLimit(env: PipelineEnv, url?: URL) {
  return resolveLimit(
    url?.searchParams.get("limit") ?? env.TEMIS_TOOL_PIPELINE_LIMIT,
  );
}

function normalizeGithubJson(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    try {
      return JSON.stringify(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }

  return JSON.stringify(value);
}

function toolLabel(tool: ToolRow) {
  return cleanString(tool.slug) || cleanString(tool.title) || tool.id;
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length, 1);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  const [scheme, token] = header.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" ? cleanString(token) : "";
}

function assertManualAuthorization(request: Request, env: PipelineEnv) {
  const configuredToken = cleanString(env.TEMIS_TOOL_PIPELINE_TOKEN);
  if (!configuredToken) {
    return jsonResponse(
      {
        success: false,
        error:
          "Manual pipeline runs require the TEMIS_TOOL_PIPELINE_TOKEN secret.",
      },
      503,
    );
  }

  if (!constantTimeEqual(bearerToken(request), configuredToken)) {
    return jsonResponse({ success: false, error: "Unauthorized." }, 401);
  }

  return null;
}

async function readCandidateTools(env: PipelineEnv, limit: number) {
  const result = await env.DB.prepare(
    `SELECT id, slug, title, repository_url, github_data, github_sync_error
       FROM ec_tools
      WHERE repository_url IS NOT NULL
        AND trim(repository_url) <> ''
        AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY updated_at DESC
      LIMIT ?`,
  )
    .bind(limit)
    .all<ToolRow>();

  return result.results;
}

async function updateToolGithubData(
  env: PipelineEnv,
  toolId: string,
  github: ToolGithubData,
  syncedAt: string,
) {
  await env.DB.prepare(
    `UPDATE ec_tools
        SET github_data = ?,
            github_synced_at = ?,
            github_sync_error = NULL,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(JSON.stringify(github), syncedAt, toolId)
    .run();
}

async function updateToolGithubError(
  env: PipelineEnv,
  tool: ToolRow,
  message: string,
) {
  if (cleanString(tool.github_sync_error) === message) return;

  await env.DB.prepare(
    `UPDATE ec_tools
        SET github_sync_error = ?
      WHERE id = ?`,
  )
    .bind(message, tool.id)
    .run();
}

async function syncTool(
  env: PipelineEnv,
  tool: ToolRow,
): Promise<ToolSyncResult> {
  const repositoryUrl = cleanString(tool.repository_url);
  const resultBase = {
    id: tool.id,
    repositoryUrl,
    slug: toolLabel(tool),
  };

  if (!repositoryUrl) {
    return { ...resultBase, status: "skipped" };
  }

  try {
    const github = await fetchToolGithubData(repositoryUrl, {
      failOnError: true,
      token: env.TEMIS_GITHUB_TOKEN,
      userAgent: "temis-tool-pipeline",
    });

    if (!github) {
      const error = "Repository URL is not a supported GitHub repository URL.";
      await updateToolGithubError(env, tool, error);
      return { ...resultBase, error, status: "error" };
    }

    const nextJson = JSON.stringify(github);
    const currentJson = normalizeGithubJson(tool.github_data);

    if (nextJson === currentJson && !cleanString(tool.github_sync_error)) {
      return { ...resultBase, status: "unchanged" };
    }

    await updateToolGithubData(env, tool.id, github, new Date().toISOString());
    return { ...resultBase, status: "changed" };
  } catch (error) {
    const message = errorMessage(error);
    await updateToolGithubError(env, tool, message);
    return { ...resultBase, error: message, status: "error" };
  }
}

async function dispatchDeployHook(
  env: PipelineEnv,
  trigger: string,
): Promise<DeployResult> {
  const hookUrl = cleanString(env.TEMIS_PAGES_DEPLOY_HOOK_URL);
  if (!hookUrl) return { configured: false };

  const response = await fetch(hookUrl, {
    method: "POST",
    headers: {
      "User-Agent": "temis-tool-pipeline",
      "X-Temis-Trigger": trigger,
    },
  });

  return {
    configured: true,
    ok: response.ok,
    status: response.status,
  };
}

async function runPipeline(
  env: PipelineEnv,
  options: { deploy: boolean; limit: number; trigger: string },
): Promise<PipelineResult> {
  const tools = await readCandidateTools(env, options.limit);
  const results: ToolSyncResult[] = [];

  for (const tool of tools) {
    results.push(await syncTool(env, tool));
  }

  const changed = results.filter(
    (result) => result.status === "changed",
  ).length;
  const errors = results.filter((result) => result.status === "error").length;
  const unchanged = results.filter(
    (result) => result.status === "unchanged",
  ).length;
  const deploy =
    options.deploy && changed > 0
      ? await dispatchDeployHook(env, options.trigger)
      : null;

  return {
    changed,
    deploy,
    errors,
    scanned: tools.length,
    tools: results,
    trigger: options.trigger,
    unchanged,
  };
}

async function handleRun(request: Request, env: PipelineEnv, url: URL) {
  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed. Use POST." },
      405,
    );
  }

  const authorizationError = assertManualAuthorization(request, env);
  if (authorizationError) return authorizationError;

  const result = await runPipeline(env, {
    deploy: url.searchParams.get("deploy") !== "0",
    limit: configuredLimit(env, url),
    trigger: "manual",
  });

  return jsonResponse({ success: true, data: result });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({
        success: true,
        data: {
          service: "temis-tool-pipeline",
          manualRunsConfigured: Boolean(
            cleanString(env.TEMIS_TOOL_PIPELINE_TOKEN),
          ),
          deployHookConfigured: Boolean(
            cleanString(env.TEMIS_PAGES_DEPLOY_HOOK_URL),
          ),
        },
      });
    }

    if (url.pathname === "/run") {
      return handleRun(request, env, url);
    }

    return jsonResponse(
      {
        success: false,
        error: "Not found.",
        routes: ["GET /health", "POST /run"],
      },
      404,
    );
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      runPipeline(env, {
        deploy: true,
        limit: configuredLimit(env),
        trigger: `cron:${controller.cron}`,
      })
        .then((result) => {
          console.log(
            JSON.stringify({
              event: "temis.toolPipeline.completed",
              result,
            }),
          );
        })
        .catch((error) => {
          console.error(
            JSON.stringify({
              error: errorMessage(error),
              event: "temis.toolPipeline.failed",
            }),
          );
        }),
    );
  },
} satisfies ExportedHandler<PipelineEnv>;
