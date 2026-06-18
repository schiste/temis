#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const DEFAULT_URL = "https://temis-cms.christophe-henner.workers.dev";
const DEFAULT_SCOPES = [
  "content:read",
  "content:write",
  "media:read",
  "media:write",
  "schema:read",
];

function usage(exitCode = 0) {
  console.log(`TEMIS EmDash MCP token helper

Usage:
  pnpm cms:mcp:token list [--url <url>] [--json]
  pnpm cms:mcp:token create --name <name> [--scope <scope>] [--expires-at <iso>] [--save-env <path>] [--json]
  pnpm cms:mcp:token revoke <token-id> [--url <url>]

Auth:
  Uses --token, EMDASH_TOKEN, or stored EmDash CLI credentials from:
  ~/.config/emdash/auth.json

Examples:
  pnpm cms:mcp:token create --name "Christophe MCP" --save-env .env.local
  pnpm cms:mcp:token list --json
  pnpm cms:mcp:token revoke 00000000-0000-0000-0000-000000000000
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    positional: [],
    scopes: [],
    url: process.env.EMDASH_URL ?? DEFAULT_URL,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") usage();
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--url" || arg === "-u") {
      options.url = requiredValue(rest, ++index, arg);
      continue;
    }
    if (arg === "--token" || arg === "-t") {
      options.token = requiredValue(rest, ++index, arg);
      continue;
    }
    if (arg === "--name") {
      options.name = requiredValue(rest, ++index, arg);
      continue;
    }
    if (arg === "--scope") {
      options.scopes.push(...splitScopes(requiredValue(rest, ++index, arg)));
      continue;
    }
    if (arg === "--expires-at") {
      options.expiresAt = requiredValue(rest, ++index, arg);
      continue;
    }
    if (arg === "--save-env") {
      options.saveEnv = requiredValue(rest, ++index, arg);
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`Unknown option: ${arg}`);
    }
    options.positional.push(arg);
  }

  if (!options.command) usage(1);
  return options;
}

function requiredValue(values, index, flag) {
  const value = values[index];
  if (!value || value.startsWith("--")) {
    fail(`${flag} requires a value.`);
  }
  return value;
}

function splitScopes(value) {
  return value
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function fail(message) {
  console.error(`[temis-mcp-token] ${message}`);
  process.exit(1);
}

function configPath() {
  const xdg = process.env.XDG_CONFIG_HOME;
  return join(
    xdg ? join(xdg, "emdash") : join(homedir(), ".config", "emdash"),
    "auth.json",
  );
}

function credentialKeys(baseUrl) {
  const keys = [];
  try {
    keys.push(new URL(baseUrl).origin);
  } catch {
    keys.push(baseUrl);
  }

  const root = findAstroProjectRoot(process.cwd());
  if (root) keys.push(`path:${root}`);
  return keys;
}

function findAstroProjectRoot(from) {
  let dir = resolve(from);
  const root = resolve("/");

  while (dir !== root) {
    for (const name of [
      "astro.config.ts",
      "astro.config.mts",
      "astro.config.js",
      "astro.config.mjs",
    ]) {
      if (existsSync(join(dir, name))) return dir;
    }

    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function readCredentialStore() {
  const path = configPath();
  if (!existsSync(path)) return {};

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`Could not parse ${path}. Run emdash login again.`);
  }
}

function writeCredentialStore(store) {
  const path = configPath();
  mkdirSync(dirname(path), { mode: 0o700, recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, "\t")}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function getStoredCredential(baseUrl) {
  const store = readCredentialStore();
  for (const key of credentialKeys(baseUrl)) {
    const credential = store[key];
    if (credential && typeof credential.accessToken === "string") {
      return { credential, key, store };
    }
  }
  return null;
}

async function resolveToken(options) {
  if (options.token) return options.token;
  if (process.env.EMDASH_TOKEN) return process.env.EMDASH_TOKEN;

  const stored = getStoredCredential(options.url);
  if (!stored) {
    fail(
      `No stored EmDash credentials for ${options.url}. Run: pnpm --filter @temis/cms exec emdash login --url ${options.url}`,
    );
  }

  const { credential } = stored;
  if (new Date(credential.expiresAt) > new Date())
    return credential.accessToken;

  if (!credential.refreshToken) {
    fail(
      "Stored EmDash credential is expired and has no refresh token. Run emdash login again.",
    );
  }

  const response = await fetch(
    new URL("/_emdash/api/oauth/token/refresh", options.url),
    {
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: credential.refreshToken,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    fail(
      `Stored EmDash credential refresh failed with HTTP ${response.status}. Run emdash login again.`,
    );
  }

  const payload = await response.json();
  const refreshed =
    payload.data &&
    typeof payload.data === "object" &&
    "access_token" in payload.data
      ? payload.data
      : payload;

  stored.store[stored.key] = {
    ...credential,
    accessToken: refreshed.access_token,
    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
  };
  writeCredentialStore(stored.store);

  return refreshed.access_token;
}

async function apiRequest(options, path, init = {}) {
  const token = await resolveToken(options);
  const response = await fetch(new URL(path, options.url), {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const body = await response.text();
  let payload;
  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    payload = { error: { message: body } };
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    fail(message);
  }

  return payload;
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function writeTokenEnv(path, baseUrl, token) {
  const absolutePath = resolve(path);
  const existing = existsSync(absolutePath)
    ? readFileSync(absolutePath, "utf8")
    : "";
  const values = {
    EMDASH_MCP_BASE_URL: baseUrl,
    EMDASH_MCP_TOKEN: token,
  };

  const seen = new Set();
  const lines = existing
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => {
      for (const [key, value] of Object.entries(values)) {
        if (line.startsWith(`${key}=`)) {
          seen.add(key);
          return `${key}=${value}`;
        }
      }
      return line;
    });

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${lines.join("\n")}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return absolutePath;
}

async function listTokens(options) {
  const payload = await apiRequest(options, "/_emdash/api/mcp/tokens");
  if (options.json) {
    printJson(payload);
    return;
  }

  const items = payload.data?.items ?? [];
  if (items.length === 0) {
    console.log("No TEMIS MCP tokens found for the current user.");
    return;
  }

  for (const item of items) {
    console.log(
      `${item.id}\t${item.prefix}\t${item.name}\t${item.scopes.join(",")}`,
    );
  }
}

async function createToken(options) {
  const name = options.name ?? `TEMIS MCP ${new Date().toISOString()}`;
  const scopes = options.scopes.length > 0 ? options.scopes : DEFAULT_SCOPES;
  const payload = await apiRequest(options, "/_emdash/api/mcp/tokens", {
    body: JSON.stringify({
      expiresAt: options.expiresAt,
      name,
      scopes,
    }),
    method: "POST",
  });

  if (options.saveEnv) {
    const path = writeTokenEnv(
      options.saveEnv,
      options.url,
      payload.data.token,
    );
    const info = payload.data.info;
    console.log(`Created token ${info.id} (${info.prefix}) for ${info.name}.`);
    console.log(`Stored EMDASH_MCP_TOKEN and EMDASH_MCP_BASE_URL in ${path}.`);
    return;
  }

  if (options.json) {
    printJson(payload);
    return;
  }

  const info = payload.data.info;
  console.log(`Created token ${info.id} (${info.prefix}) for ${info.name}.`);
  console.log("This raw token is shown once:");
  console.log(payload.data.token);
}

async function revokeToken(options) {
  const tokenId = options.positional[0];
  if (!tokenId) fail("revoke requires a token id.");

  const payload = await apiRequest(
    options,
    `/_emdash/api/mcp/tokens/${encodeURIComponent(tokenId)}`,
    {
      method: "DELETE",
    },
  );

  if (options.json) {
    printJson(payload);
    return;
  }

  console.log(`Revoked token ${tokenId}.`);
}

const options = parseArgs(process.argv.slice(2));

if (options.command === "list") {
  await listTokens(options);
} else if (options.command === "create") {
  await createToken(options);
} else if (options.command === "revoke") {
  await revokeToken(options);
} else {
  usage(1);
}
