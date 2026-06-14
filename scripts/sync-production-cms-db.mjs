#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const wranglerBin = path.join(rootDir, "node_modules", ".bin", "wrangler");
const importsDir = path.join(rootDir, "imports");
const sqlPath = path.join(importsDir, "temis-cms-production-replica.sql");
const cmsDbPath = path.join(rootDir, "apps", "cms", "data.db");
const tmpDbPath = path.join(
  rootDir,
  "apps",
  "cms",
  "data.production-replica.tmp.db",
);
const backupDbPath = path.join(
  rootDir,
  "apps",
  "cms",
  `data.before-production-replica.${timestamp()}.db`,
);

function timestamp() {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function d1(command) {
  const stdout = run(wranglerBin, [
    "d1",
    "execute",
    "temis-cms-db",
    "--remote",
    "--json",
    "--command",
    command,
  ]);
  const parsed = JSON.parse(stdout);
  return parsed.flatMap((statement) => statement.results ?? []);
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "object") return literal(JSON.stringify(value));
  return `'${String(value).replaceAll("'", "''")}'`;
}

function isVirtualTable(row) {
  return /^CREATE\s+VIRTUAL\s+TABLE/i.test(row.sql ?? "");
}

function ftsBaseName(name) {
  return name.match(/^(.+)_((?:data)|(?:idx)|(?:docsize)|(?:config))$/)?.[1];
}

function buildInsert(tableName, columns, row) {
  const columnList = columns
    .map((column) => quoteIdent(column.name))
    .join(", ");
  const values = columns.map((column) => literal(row[column.name])).join(", ");
  return `INSERT INTO ${quoteIdent(tableName)} (${columnList}) VALUES (${values});`;
}

mkdirSync(importsDir, { recursive: true });

const schemaRows = d1(
  "SELECT name, type, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND sql IS NOT NULL ORDER BY type, name",
);
const virtualTableNames = new Set(
  schemaRows
    .filter((row) => row.type === "table" && isVirtualTable(row))
    .map((row) => row.name),
);
const ftsShadowNames = new Set(
  schemaRows
    .filter((row) => row.type === "table")
    .map((row) => [row.name, ftsBaseName(row.name)])
    .filter(([, baseName]) => baseName && virtualTableNames.has(baseName))
    .map(([name]) => name),
);
const normalTables = schemaRows.filter(
  (row) =>
    row.type === "table" &&
    !isVirtualTable(row) &&
    !ftsShadowNames.has(row.name),
);
const virtualTables = schemaRows.filter(
  (row) => row.type === "table" && isVirtualTable(row),
);
const indexes = schemaRows.filter((row) => row.type === "index");
const triggers = schemaRows.filter((row) => row.type === "trigger");

const sql = [
  "PRAGMA foreign_keys=OFF;",
  "BEGIN;",
  ...normalTables.map((row) => `${row.sql};`),
  ...virtualTables.map((row) => `${row.sql};`),
];

for (const table of normalTables) {
  const columns = d1(`PRAGMA table_info(${quoteIdent(table.name)})`);
  const rows = d1(`SELECT * FROM ${quoteIdent(table.name)}`);
  for (const row of rows) {
    sql.push(buildInsert(table.name, columns, row));
  }
}

sql.push(
  ...indexes.map((row) => `${row.sql};`),
  ...triggers.map((row) => `${row.sql};`),
  ...[...virtualTableNames].map(
    (name) =>
      `INSERT INTO ${quoteIdent(name)}(${quoteIdent(name)}) VALUES ('rebuild');`,
  ),
  "COMMIT;",
  "",
);

writeFileSync(sqlPath, sql.join("\n"), "utf8");

rmSync(tmpDbPath, { force: true });
const importResult = spawnSync("sqlite3", [tmpDbPath], {
  cwd: rootDir,
  encoding: "utf8",
  input: sql.join("\n"),
  stdio: ["pipe", "pipe", "pipe"],
});
if (importResult.status !== 0) {
  throw new Error(
    `sqlite3 import failed\n${importResult.stderr || importResult.stdout}`,
  );
}

if (existsSync(cmsDbPath)) {
  copyFileSync(cmsDbPath, backupDbPath);
  console.log(`Backed up existing local CMS database to ${backupDbPath}`);
}

renameSync(tmpDbPath, cmsDbPath);
rmSync(path.join(rootDir, "apps", "cms", "data.db-shm"), { force: true });
rmSync(path.join(rootDir, "apps", "cms", "data.db-wal"), { force: true });

console.log(`Production D1 read-only replica imported into ${cmsDbPath}`);
console.log(`Generated SQL dump written to ${sqlPath}`);
console.log(
  "Local CMS dev writes only to the SQLite replica, not production D1.",
);
