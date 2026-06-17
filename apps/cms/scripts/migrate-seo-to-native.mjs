#!/usr/bin/env node

/**
 * Copy legacy per-entry SEO from the custom `seo_title` / `seo_description`
 * content columns into EmDash's native `_emdash_seo` table.
 *
 * EmDash stores native SEO in `_emdash_seo`, keyed by (collection slug,
 * content id), and surfaces it through the admin SEO panel, the content API
 * (`ContentItem.seo`), and the snapshot. TEMIS historically authored SEO in
 * custom fields instead, so the native table is empty. This migration seeds it
 * from the existing column values so native SEO becomes the single source of
 * truth (read by the static site and evaluated by the Aexeo plugin).
 *
 * The migration is additive and idempotent: it only writes `seo_title` /
 * `seo_description`, leaves `seo_image` / `seo_canonical` / `seo_no_index`
 * untouched, and re-running it produces the same result. It never deletes the
 * legacy columns — that is a separate, gated step.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  defaultD1Database,
  defaultDatabasePath,
  quoteIdent,
  rootDir,
  sqlLiteral,
} from "../schema/lib.mjs";

const collectionTables = new Map([
  ["posts", "ec_posts"],
  ["pages", "ec_pages"],
  ["tools", "ec_tools"],
]);

function parseArgs(argv) {
  const args = {
    collection: null,
    database: defaultDatabasePath,
    d1Database: defaultD1Database,
    dryRun: false,
    mode: "local",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--production") {
      args.mode = "production";
    } else if (arg === "--local") {
      args.mode = "local";
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--collection") {
      args.collection = argv[(index += 1)];
    } else if (arg.startsWith("--collection=")) {
      args.collection = arg.slice("--collection=".length);
    } else if (arg === "--database") {
      args.database = path.resolve(rootDir, argv[(index += 1)]);
    } else if (arg.startsWith("--database=")) {
      args.database = path.resolve(rootDir, arg.slice("--database=".length));
    } else if (arg === "--d1-database") {
      args.d1Database = argv[(index += 1)];
    } else if (arg.startsWith("--d1-database=")) {
      args.d1Database = arg.slice("--d1-database=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.collection && !collectionTables.has(args.collection)) {
    throw new Error(
      `Unsupported collection "${args.collection}". Supported collections: ${[
        ...collectionTables.keys(),
      ].join(", ")}`,
    );
  }

  return args;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    input: options.input,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed\n${
        result.stderr || result.stdout
      }`,
    );
  }

  return result.stdout;
}

function execJson(args, sql) {
  if (args.mode === "production") {
    const wranglerBin = path.join(rootDir, "node_modules", ".bin", "wrangler");
    const stdout = run(wranglerBin, [
      "d1",
      "execute",
      args.d1Database,
      "--remote",
      "--json",
      "--command",
      sql,
    ]);

    return JSON.parse(stdout).flatMap((statement) => statement.results ?? []);
  }

  const stdout = run("sqlite3", [
    "-json",
    "-cmd",
    ".timeout 5000",
    args.database,
    sql,
  ]);

  return stdout.trim() ? JSON.parse(stdout) : [];
}

function execSqlFile(args, sql) {
  if (args.mode === "production") {
    const wranglerBin = path.join(rootDir, "node_modules", ".bin", "wrangler");
    const tmpPath = path.join(
      mkdtempSync(path.join(tmpdir(), "temis-seo-migrate-")),
      "migrate.sql",
    );
    writeFileSync(tmpPath, sql, "utf8");
    run(wranglerBin, [
      "d1",
      "execute",
      args.d1Database,
      "--remote",
      "--file",
      tmpPath,
    ]);
    return;
  }

  run("sqlite3", [args.database], {
    stdio: ["pipe", "pipe", "pipe"],
    input: sql,
  });
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function selectSql(table) {
  return [
    "SELECT id, seo_title, seo_description",
    `FROM ${quoteIdent(table)}`,
    "WHERE deleted_at IS NULL",
    "AND ((seo_title IS NOT NULL AND seo_title != '')",
    "OR (seo_description IS NOT NULL AND seo_description != ''))",
    "ORDER BY id",
  ].join(" ");
}

/**
 * Idempotent upsert that seeds only title/description. On conflict it refreshes
 * those two fields without touching image/canonical/no_index, matching how the
 * core SEO repository merges explicitly-provided fields.
 */
function upsertSql(collection, row) {
  const title = cleanString(row.seo_title);
  const description = cleanString(row.seo_description);

  return [
    "INSERT INTO _emdash_seo",
    "(collection, content_id, seo_title, seo_description, seo_no_index, created_at, updated_at)",
    `VALUES (${sqlLiteral(collection)}, ${sqlLiteral(row.id)}, ${sqlLiteral(
      title || null,
    )}, ${sqlLiteral(description || null)}, 0, datetime('now'), datetime('now'))`,
    "ON CONFLICT(collection, content_id) DO UPDATE SET",
    "seo_title = excluded.seo_title,",
    "seo_description = excluded.seo_description,",
    "updated_at = datetime('now')",
  ].join(" ");
}

function serializeStatements(statements) {
  return `${statements
    .map((statement) =>
      statement.trim().endsWith(";")
        ? statement.trim()
        : `${statement.trim()};`,
    )
    .join("\n")}\n`;
}

const args = parseArgs(process.argv.slice(2));
const collections = args.collection
  ? [[args.collection, collectionTables.get(args.collection)]]
  : [...collectionTables.entries()];
const statements = args.mode === "production" ? [] : ["BEGIN;"];
const summary = [];

for (const [collection, table] of collections) {
  const rows = execJson(args, selectSql(table));
  for (const row of rows) {
    statements.push(upsertSql(collection, row));
  }
  summary.push({ collection, migratedEntries: rows.length });
}

if (args.mode !== "production") statements.push("COMMIT;");

console.log(JSON.stringify({ dryRun: args.dryRun, mode: args.mode, summary }));

const changedStatementCount =
  args.mode === "production" ? statements.length : statements.length - 2;

if (changedStatementCount === 0 || args.dryRun) {
  process.exit(0);
}

execSqlFile(args, serializeStatements(statements));
