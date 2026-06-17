#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { quoteIdent, sqlLiteral } from "../schema/lib.mjs";

const cmsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSeedPath = path.join(cmsDir, ".emdash", "seed.json");
const defaultDatabasePath = path.join(cmsDir, "data.db");
const emdashBin = path.join(cmsDir, "node_modules", ".bin", "emdash");

const optionsWithValues = new Set([
  "-d",
  "--cwd",
  "--database",
  "--media-base-url",
  "--on-conflict",
  "--uploads-dir",
]);

function parseArgs(argv) {
  const passthrough = [];
  let database = defaultDatabasePath;
  let seedPath = defaultSeedPath;
  let validateOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--validate") {
      validateOnly = true;
      passthrough.push(arg);
      continue;
    }

    if (arg === "-d" || arg === "--database") {
      const value = argv[index + 1];
      if (value) database = path.resolve(cmsDir, value);
      passthrough.push(arg);
      passthrough.push(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--database=")) {
      database = path.resolve(cmsDir, arg.slice("--database=".length));
      passthrough.push(arg);
      continue;
    }

    if (optionsWithValues.has(arg)) {
      passthrough.push(arg);
      passthrough.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (!arg.startsWith("-")) {
      seedPath = path.resolve(cmsDir, arg);
      continue;
    }

    passthrough.push(arg);
  }

  return { database, passthrough, seedPath, validateOnly };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractNativeSeoSeed(seed) {
  const rows = [];
  const stripped = structuredClone(seed);
  const content = isRecord(stripped.content) ? stripped.content : {};

  for (const [collection, entries] of Object.entries(content)) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (!isRecord(entry) || !isRecord(entry.data)) continue;

      const title = cleanString(entry.data.seo_title);
      const description = cleanString(entry.data.seo_description);
      if (title || description) {
        rows.push({
          collection,
          contentId: cleanString(entry.id),
          description,
          slug: cleanString(entry.slug),
          title,
        });
      }

      delete entry.data.seo_title;
      delete entry.data.seo_description;
    }
  }

  return { rows: rows.filter((row) => row.contentId), stripped };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: cmsDir,
    encoding: "utf8",
    input: options.input,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function execJson(database, sql) {
  const stdout = run("sqlite3", ["-json", database, sql]);
  return stdout.trim() ? JSON.parse(stdout) : [];
}

function collectionTable(collection) {
  if (!/^[a-z0-9_]+$/i.test(collection)) {
    throw new Error(`Unsupported collection slug: ${collection}`);
  }

  return `ec_${collection}`;
}

function resolveNativeSeoRows(database, rows) {
  return rows.flatMap((row) => {
    const table = collectionTable(row.collection);
    const candidates = execJson(
      database,
      [
        "SELECT id",
        `FROM ${quoteIdent(table)}`,
        `WHERE slug = ${sqlLiteral(row.slug)}`,
        "AND deleted_at IS NULL",
        `ORDER BY CASE WHEN id = ${sqlLiteral(row.contentId)} THEN 0 ELSE 1 END, updated_at DESC`,
        "LIMIT 1",
      ].join(" "),
    );
    const contentId = cleanString(candidates[0]?.id) || row.contentId;

    return contentId
      ? [
          {
            ...row,
            contentId,
          },
        ]
      : [];
  });
}

function upsertSeoSql(rows) {
  if (rows.length === 0) return "";

  const statements = rows.map((row) =>
    [
      "INSERT INTO _emdash_seo",
      "(collection, content_id, seo_title, seo_description, seo_no_index, created_at, updated_at)",
      `VALUES (${sqlLiteral(row.collection)}, ${sqlLiteral(
        row.contentId,
      )}, ${sqlLiteral(row.title || null)}, ${sqlLiteral(
        row.description || null,
      )}, 0, datetime('now'), datetime('now'))`,
      "ON CONFLICT(collection, content_id) DO UPDATE SET",
      "seo_title = excluded.seo_title,",
      "seo_description = excluded.seo_description,",
      "updated_at = datetime('now')",
    ].join(" "),
  );
  const cleanupStatements = [...new Set(rows.map((row) => row.collection))].map(
    (collection) =>
      [
        "DELETE FROM _emdash_seo",
        `WHERE collection = ${sqlLiteral(collection)}`,
        `AND content_id NOT IN (SELECT id FROM ${quoteIdent(
          collectionTable(collection),
        )})`,
      ].join(" "),
  );

  return `BEGIN;\n${[...statements, ...cleanupStatements].join(
    ";\n",
  )};\nCOMMIT;\n`;
}

const args = parseArgs(process.argv.slice(2));
const rawSeed = JSON.parse(await readFile(args.seedPath, "utf8"));
const { rows, stripped } = extractNativeSeoSeed(rawSeed);
const tempDir = await mkdtemp(path.join(tmpdir(), "temis-emdash-seed-"));
const tempSeedPath = path.join(tempDir, "seed.json");

try {
  await writeFile(tempSeedPath, JSON.stringify(stripped, null, 2) + "\n");
  run(emdashBin, ["seed", ...args.passthrough, tempSeedPath], {
    stdio: "inherit",
  });

  if (!args.validateOnly) {
    const sql = upsertSeoSql(resolveNativeSeoRows(args.database, rows));
    if (sql) {
      run("sqlite3", [args.database], {
        input: sql,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }
  }
} finally {
  await rm(tempDir, { force: true, recursive: true });
}
