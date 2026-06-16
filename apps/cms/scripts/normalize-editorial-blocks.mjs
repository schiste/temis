#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { normalizeEditorialContent } from "@temis/emdash-editorial-blocks";
import {
  defaultD1Database,
  defaultDatabasePath,
  quoteIdent,
  rootDir,
  sqlLiteral,
} from "../schema/lib.mjs";

const defaultCollections = new Map([
  ["posts", "ec_posts"],
  ["pages", "ec_pages"],
]);

function parseArgs(argv) {
  const args = {
    collection: null,
    database: defaultDatabasePath,
    d1Database: defaultD1Database,
    dryRun: false,
    mode: "local",
    slug: null,
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
    } else if (arg === "--slug") {
      args.slug = argv[(index += 1)];
    } else if (arg.startsWith("--slug=")) {
      args.slug = arg.slice("--slug=".length);
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

  if (args.collection && !defaultCollections.has(args.collection)) {
    throw new Error(
      `Unsupported collection "${args.collection}". Supported collections: ${[
        ...defaultCollections.keys(),
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
  const tmpPath = path.join(
    mkdtempSync(path.join(tmpdir(), "temis-editorial-blocks-")),
    "normalize.sql",
  );
  writeFileSync(tmpPath, sql, "utf8");

  if (args.mode === "production") {
    const wranglerBin = path.join(rootDir, "node_modules", ".bin", "wrangler");
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

function parseJson(value, fallback) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  return JSON.parse(value);
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function normalizeContentField(value) {
  const parsed = parseJson(value, []);
  const normalized = normalizeEditorialContent({ content: parsed }).content;

  return {
    changed: canonicalJson(parsed) !== canonicalJson(normalized),
    value: normalized,
  };
}

function normalizeRevisionData(value) {
  const parsed = parseJson(value, {});
  const normalized = normalizeEditorialContent(parsed);

  return {
    changed: canonicalJson(parsed) !== canonicalJson(normalized),
    value: normalized,
  };
}

function entrySelectSql(collection, table, slug) {
  const where = [
    "content IS NOT NULL",
    slug ? `slug = ${sqlLiteral(slug)}` : null,
  ]
    .filter(Boolean)
    .join(" AND ");

  return [
    "SELECT id, slug, content, live_revision_id, draft_revision_id",
    `FROM ${quoteIdent(table)}`,
    `WHERE ${where}`,
    "ORDER BY updated_at DESC, id DESC",
  ].join(" ");
}

function revisionSelectSql(revisionIds) {
  const ids = revisionIds.map(sqlLiteral).join(", ");
  return `SELECT id, data FROM revisions WHERE id IN (${ids})`;
}

function changedRevisionIds(entry) {
  return [entry.live_revision_id, entry.draft_revision_id].filter(Boolean);
}

function updateEntrySql(table, entry, normalizedContent) {
  return [
    `UPDATE ${quoteIdent(table)}`,
    `SET content = ${sqlLiteral(JSON.stringify(normalizedContent))}`,
    `WHERE id = ${sqlLiteral(entry.id)}`,
  ].join(" ");
}

function updateRevisionSql(revision, normalizedData) {
  return [
    "UPDATE revisions",
    `SET data = ${sqlLiteral(JSON.stringify(normalizedData))}`,
    `WHERE id = ${sqlLiteral(revision.id)}`,
  ].join(" ");
}

const args = parseArgs(process.argv.slice(2));
const collections = args.collection
  ? [[args.collection, defaultCollections.get(args.collection)]]
  : [...defaultCollections.entries()];
const statements = ["BEGIN;"];
const summary = [];

for (const [collection, table] of collections) {
  const entries = execJson(args, entrySelectSql(collection, table, args.slug));
  let changedEntries = 0;
  let changedRevisions = 0;

  for (const entry of entries) {
    const normalizedEntry = normalizeContentField(entry.content);
    if (normalizedEntry.changed) {
      changedEntries += 1;
      statements.push(updateEntrySql(table, entry, normalizedEntry.value));
    }

    const revisionIds = changedRevisionIds(entry);
    if (revisionIds.length > 0) {
      const revisions = execJson(args, revisionSelectSql(revisionIds));
      for (const revision of revisions) {
        const normalizedRevision = normalizeRevisionData(revision.data);
        if (normalizedRevision.changed) {
          changedRevisions += 1;
          statements.push(
            updateRevisionSql(revision, normalizedRevision.value),
          );
        }
      }
    }
  }

  summary.push({
    changedEntries,
    changedRevisions,
    collection,
    scannedEntries: entries.length,
  });
}

statements.push("COMMIT;");

console.log(JSON.stringify({ dryRun: args.dryRun, mode: args.mode, summary }));

if (statements.length <= 2 || args.dryRun) {
  process.exit(0);
}

execSqlFile(args, `${statements.join("\n")}\n`);
