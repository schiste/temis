#!/usr/bin/env node

/**
 * Migrate posts from the legacy four-field featured-image model
 * (`featured_image` image + `featured_image_alt`/`_caption`/`_license`) to a
 * single consolidated `featured_image` json field, edited via the
 * `temis-media-fields:imageWithMeta` widget (alt/caption/license live inside
 * the json value).
 *
 * Because SQLite cannot change an existing column's type in place, and the
 * legacy fields are currently empty, this drops all four legacy columns and
 * their `_emdash_fields` rows. `cms:schema:apply` (run afterwards) recreates
 * `featured_image` as a fresh JSON column with the widget, from seed.json.
 * There is no data to preserve.
 *
 * Like the other field-retirement scripts it only handles NON-searchable
 * fields (searchable fields need FTS trigger teardown) and refuses otherwise.
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

// collection slug -> { table, legacy fields to drop }.
const targets = new Map([
  [
    "posts",
    {
      table: "ec_posts",
      fields: [
        "featured_image",
        "featured_image_alt",
        "featured_image_caption",
        "featured_image_license",
      ],
    },
  ],
]);

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
      mkdtempSync(path.join(tmpdir(), "temis-featured-image-")),
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

function existingFieldsSql() {
  const conditions = [...targets.entries()]
    .map(([collection, { fields }]) => {
      const fieldList = fields.map(sqlLiteral).join(", ");
      return `(c.slug = ${sqlLiteral(collection)} AND f.slug IN (${fieldList}))`;
    })
    .join(" OR ");
  return [
    "SELECT f.id AS id, c.slug AS collection, f.slug AS field, f.searchable AS searchable",
    "FROM _emdash_fields f",
    "JOIN _emdash_collections c ON c.id = f.collection_id",
    `WHERE ${conditions}`,
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
  const table = targets.get(field.collection)?.table;
  if (!table) continue;
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
