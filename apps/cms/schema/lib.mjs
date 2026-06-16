import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const schemaDir = path.dirname(fileURLToPath(import.meta.url));
export const cmsDir = path.resolve(schemaDir, "..");
export const rootDir = path.resolve(cmsDir, "..", "..");
export const defaultDatabasePath = path.join(cmsDir, "data.db");
export const defaultD1Database = "temis-cms-db";
export const schemaPath = path.join(schemaDir, "tools.schema.json");

export function parseArgs(argv) {
  const args = {
    database: defaultDatabasePath,
    d1Database: defaultD1Database,
    mode: "local",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--local") {
      args.mode = "local";
    } else if (arg === "--production") {
      args.mode = "production";
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

export async function loadToolsSchema() {
  const raw = await readFile(schemaPath, "utf8");
  return JSON.parse(raw);
}

export function toolsCollection(schema) {
  const collection = schema.collections?.find((item) => item.slug === "tools");
  if (!collection) {
    throw new Error(`Missing tools collection in ${schemaPath}`);
  }
  return collection;
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

function parseSqliteJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed);
}

function createLocalAdapter(database) {
  return {
    async exec(sql) {
      return parseSqliteJson(run("sqlite3", ["-json", database, sql]));
    },
  };
}

function createProductionAdapter(d1Database) {
  const wranglerBin = path.join(rootDir, "node_modules", ".bin", "wrangler");

  return {
    async exec(sql) {
      const stdout = run(wranglerBin, [
        "d1",
        "execute",
        d1Database,
        "--remote",
        "--json",
        "--command",
        sql,
      ]);
      const parsed = JSON.parse(stdout);
      return parsed.flatMap((statement) => statement.results ?? []);
    },
  };
}

export function createDbAdapter(args) {
  return args.mode === "production"
    ? createProductionAdapter(args.d1Database)
    : createLocalAdapter(args.database);
}

export function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

export function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") return sqlLiteral(JSON.stringify(value));
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function normalizeSqlType(type) {
  return String(type ?? "")
    .trim()
    .toUpperCase();
}

export function normalizeJsonValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return value;
    }
  }
  return JSON.stringify(value);
}

export function normalizeDefaultValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function fieldMetadata(collectionId, field, sortOrder) {
  return {
    collection_id: collectionId,
    column_type: field.columnType,
    default_value: normalizeDefaultValue(field.defaultValue),
    id: `seed_field_tools_${field.slug}`,
    label: field.label,
    options: normalizeJsonValue(field.options),
    required: field.required ? 1 : 0,
    searchable: field.searchable ? 1 : 0,
    slug: field.slug,
    sort_order: sortOrder,
    translatable: field.translatable === false ? 0 : 1,
    type: field.type,
    unique: field.unique ? 1 : 0,
    validation: normalizeJsonValue(field.validation),
    widget: field.widget ?? null,
  };
}

export const fieldMetadataKeys = [
  "label",
  "type",
  "column_type",
  "required",
  "unique",
  "default_value",
  "validation",
  "widget",
  "options",
  "sort_order",
  "searchable",
  "translatable",
];

export function metadataValue(row, key) {
  return key === "validation" || key === "options"
    ? normalizeJsonValue(row[key])
    : row[key];
}

export function fieldMetadataDiffers(actual, expected) {
  return fieldMetadataKeys.some(
    (key) =>
      String(metadataValue(actual, key) ?? "") !== String(expected[key] ?? ""),
  );
}

export async function readToolsState(db, collection) {
  const collectionRows = await db.exec(
    `SELECT * FROM _emdash_collections WHERE slug = ${sqlLiteral(collection.slug)}`,
  );
  const [collectionRow] = collectionRows;

  const tableRows = await db.exec(
    `PRAGMA table_info(${quoteIdent(collection.table)})`,
  );
  const fields = collectionRow
    ? await db.exec(
        `SELECT * FROM _emdash_fields WHERE collection_id = ${sqlLiteral(
          collectionRow.id,
        )} ORDER BY sort_order, slug`,
      )
    : [];

  return {
    collection: collectionRow ?? null,
    columns: tableRows,
    fields,
  };
}

export function compareToolsSchema(collection, state) {
  const failures = [];
  const warnings = [];
  const columnsByName = new Map(state.columns.map((row) => [row.name, row]));
  const fieldsBySlug = new Map(state.fields.map((row) => [row.slug, row]));

  if (!state.collection) {
    failures.push(`Missing EmDash collection: ${collection.slug}`);
  }

  for (const [index, field] of collection.fields.entries()) {
    const column = columnsByName.get(field.slug);
    const metadata = fieldsBySlug.get(field.slug);
    const expectedMetadata = state.collection
      ? fieldMetadata(state.collection.id, field, index)
      : null;

    if (!column) {
      failures.push(`Missing ${collection.table}.${field.slug} column`);
    } else if (
      normalizeSqlType(column.type) !== normalizeSqlType(field.columnType)
    ) {
      failures.push(
        `Column ${collection.table}.${field.slug} type drift: expected ${field.columnType}, got ${column.type}`,
      );
    }

    if (!metadata) {
      failures.push(`Missing _emdash_fields metadata for tools.${field.slug}`);
      continue;
    }

    for (const key of fieldMetadataKeys) {
      const actual = metadataValue(metadata, key);
      const expected = expectedMetadata[key];

      if (String(actual ?? "") !== String(expected ?? "")) {
        failures.push(
          `Field tools.${field.slug} ${key} drift: expected ${JSON.stringify(
            expected,
          )}, got ${JSON.stringify(actual)}`,
        );
      }
    }
  }

  for (const field of state.fields) {
    if (!collection.fields.some((expected) => expected.slug === field.slug)) {
      warnings.push(`Extra tools field metadata present: ${field.slug}`);
    }
  }

  return { failures, warnings };
}
