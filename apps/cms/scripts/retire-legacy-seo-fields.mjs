#!/usr/bin/env node

/**
 * Retire the legacy custom SEO fields now that SEO is canonicalized on the
 * native `_emdash_seo` table (see migrate-seo-to-native.mjs).
 *
 * For each (collection, field) target this removes the `_emdash_fields`
 * registry row and drops the physical column from the content table — the same
 * two operations EmDash's `registry.deleteField()` performs. We do it directly
 * here so it runs against the local SQLite DB and production D1 through the
 * existing schema-script harness.
 *
 * Safety: this only handles NON-searchable fields. Searchable fields are
 * referenced by FTS triggers that must be torn down first; the script refuses
 * to touch any field with `searchable = 1` rather than risk a half-applied
 * drop. The legacy SEO fields are non-searchable, so this is a clean drop.
 *
 * The migration must run first — dropping these columns is only safe once their
 * values live in `_emdash_seo`.
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
  ["publications", "ec_publications"],
  ["tools", "ec_tools"],
]);

const targetFields = ["seo_title", "seo_description"];

function parseArgs(argv) {
  const args = {
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
      mkdtempSync(path.join(tmpdir(), "temis-seo-retire-")),
      "retire.sql",
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

function existingFieldsSql() {
  const fieldList = targetFields.map(sqlLiteral).join(", ");
  const collectionList = [...collectionTables.keys()]
    .map(sqlLiteral)
    .join(", ");
  return [
    "SELECT f.id AS id, c.slug AS collection, f.slug AS field, f.searchable AS searchable",
    "FROM _emdash_fields f",
    "JOIN _emdash_collections c ON c.id = f.collection_id",
    `WHERE c.slug IN (${collectionList}) AND f.slug IN (${fieldList})`,
    "ORDER BY c.slug, f.slug",
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
const fields = execJson(args, existingFieldsSql());

const searchable = fields.filter((field) => Number(field.searchable) === 1);
if (searchable.length > 0) {
  const names = searchable.map((f) => `${f.collection}.${f.field}`).join(", ");
  throw new Error(
    `Refusing to drop searchable field(s): ${names}. ` +
      "Searchable fields require FTS trigger teardown (use registry.deleteField).",
  );
}

const statements = args.mode === "production" ? [] : ["BEGIN;"];
const summary = [];

for (const field of fields) {
  const table = collectionTables.get(field.collection);
  statements.push(
    `DELETE FROM _emdash_fields WHERE id = ${sqlLiteral(field.id)}`,
  );
  statements.push(
    `ALTER TABLE ${quoteIdent(table)} DROP COLUMN ${quoteIdent(field.field)}`,
  );
  summary.push({ collection: field.collection, field: field.field });
}

if (args.mode !== "production") statements.push("COMMIT;");

console.log(JSON.stringify({ dryRun: args.dryRun, mode: args.mode, summary }));

const changedStatementCount =
  args.mode === "production" ? statements.length : statements.length - 2;

if (changedStatementCount === 0 || args.dryRun) {
  process.exit(0);
}

execSqlFile(args, serializeStatements(statements));
