import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const schemaDir = path.dirname(fileURLToPath(import.meta.url));
export const cmsDir = path.resolve(schemaDir, "..");
export const rootDir = path.resolve(cmsDir, "..", "..");
export const defaultDatabasePath = path.join(cmsDir, "data.db");
export const defaultD1Database = "temis-cms-db";
export const seedPath = path.join(cmsDir, ".emdash", "seed.json");
export const siteSchemaPath = path.join(schemaDir, "site.schema.json");

const collectionMetadataKeys = [
  "label",
  "label_singular",
  "description",
  "icon",
  "supports",
  "url_pattern",
];

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

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function loadSchemaContract() {
  const [seed, siteSchema] = await Promise.all([
    readJson(seedPath),
    readJson(siteSchemaPath),
  ]);

  return {
    seed,
    siteSchema,
  };
}

export function collectionContracts(contract) {
  return (contract.seed.collections ?? []).map((collection) => ({
    ...collection,
    table: collection.table ?? `ec_${collection.slug}`,
    fields: (collection.fields ?? []).map((field) => ({
      ...field,
      columnType: field.columnType ?? inferColumnType(field.type),
    })),
  }));
}

export function taxonomyDefinitions(contract) {
  return contract.seed.taxonomies ?? [];
}

function inferColumnType(type) {
  switch (type) {
    case "boolean":
      return "INTEGER";
    case "number":
      return "REAL";
    case "portableText":
    case "json":
      return "JSON";
    default:
      return "TEXT";
  }
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
      return parseSqliteJson(
        run("sqlite3", [
          "-json",
          "-cmd",
          ".timeout 5000",
          "-cmd",
          "PRAGMA trusted_schema=ON",
          database,
          sql,
        ]),
      );
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

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function fieldMetadata(collectionId, collectionSlug, field, sortOrder) {
  return {
    collection_id: collectionId,
    column_type: field.columnType,
    default_value: normalizeDefaultValue(field.defaultValue),
    id: `schema_field_${collectionSlug}_${field.slug}`,
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

function collectionMetadata(collection) {
  return {
    description: collection.description ?? null,
    icon: collection.icon ?? null,
    label: collection.label,
    label_singular: collection.labelSingular ?? collection.label_singular,
    supports: normalizeJsonValue(collection.supports ?? []),
    url_pattern: collection.urlPattern ?? collection.url_pattern ?? null,
  };
}

export function metadataValue(row, key) {
  return key === "validation" || key === "options" || key === "supports"
    ? normalizeJsonValue(row[key])
    : row[key];
}

export function fieldMetadataDiffers(actual, expected) {
  return fieldMetadataKeys.some(
    (key) =>
      String(metadataValue(actual, key) ?? "") !== String(expected[key] ?? ""),
  );
}

export async function readCollectionState(db, collection) {
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

export function compareCollectionSchema(collection, state) {
  const failures = [];
  const warnings = [];
  const columnsByName = new Map(state.columns.map((row) => [row.name, row]));
  const fieldsBySlug = new Map(state.fields.map((row) => [row.slug, row]));
  const expectedCollection = collectionMetadata(collection);

  if (!state.collection) {
    failures.push(`Missing EmDash collection: ${collection.slug}`);
  } else {
    for (const key of collectionMetadataKeys) {
      const actual = metadataValue(state.collection, key);
      const expected = expectedCollection[key];
      if (String(actual ?? "") !== String(expected ?? "")) {
        failures.push(
          `Collection ${collection.slug} ${key} drift: expected ${JSON.stringify(
            expected,
          )}, got ${JSON.stringify(actual)}`,
        );
      }
    }
  }

  for (const [index, field] of collection.fields.entries()) {
    const column = columnsByName.get(field.slug);
    const metadata = fieldsBySlug.get(field.slug);
    const expectedMetadata = state.collection
      ? fieldMetadata(state.collection.id, collection.slug, field, index)
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
      failures.push(
        `Missing _emdash_fields metadata for ${collection.slug}.${field.slug}`,
      );
      continue;
    }

    for (const key of fieldMetadataKeys) {
      const actual = metadataValue(metadata, key);
      const expected = expectedMetadata[key];

      if (String(actual ?? "") !== String(expected ?? "")) {
        failures.push(
          `Field ${collection.slug}.${field.slug} ${key} drift: expected ${JSON.stringify(
            expected,
          )}, got ${JSON.stringify(actual)}`,
        );
      }
    }
  }

  const expectedFieldSlugs = new Set(
    collection.fields.map((field) => field.slug),
  );
  for (const field of state.fields) {
    if (!expectedFieldSlugs.has(field.slug)) {
      warnings.push(
        `Extra ${collection.slug} field metadata present: ${field.slug}`,
      );
    }
  }

  return { failures, warnings };
}

export async function readTaxonomyState(db) {
  const definitions = await db.exec(
    "SELECT * FROM _emdash_taxonomy_defs ORDER BY name",
  );
  const terms = await db.exec("SELECT * FROM taxonomies ORDER BY name, slug");
  const assignments = await db.exec(
    "SELECT * FROM content_taxonomies ORDER BY collection, entry_id, taxonomy_id",
  );

  return { assignments, definitions, terms };
}

export async function readBylineState(db) {
  const bylines = await db.exec("SELECT * FROM _emdash_bylines ORDER BY slug");
  const assignments = await db.exec(
    "SELECT * FROM _emdash_content_bylines ORDER BY collection_slug, content_id, sort_order",
  );

  return { assignments, bylines };
}

export async function readMenuState(db) {
  const menus = await db.exec("SELECT * FROM _emdash_menus ORDER BY name");
  const items = await db.exec(
    "SELECT * FROM _emdash_menu_items ORDER BY menu_id, sort_order, label",
  );

  return { items, menus };
}

export async function readOptionState(db) {
  return db.exec("SELECT * FROM options ORDER BY name");
}

export async function readContentRows(db, collections) {
  const rows = new Map();

  for (const collection of collections) {
    rows.set(
      collection.slug,
      await db.exec(
        `SELECT * FROM ${quoteIdent(collection.table)} WHERE deleted_at IS NULL ORDER BY slug`,
      ),
    );
  }

  return rows;
}

export function taxonomyTermId(term) {
  return `schema:taxonomy:${term.taxonomy}:${term.slug}`;
}

export function compareTaxonomySchema(contract, state) {
  const failures = [];
  const definitionsByName = new Map(
    state.definitions.map((definition) => [definition.name, definition]),
  );
  const termsByKey = new Map(
    state.terms.map((term) => [`${term.name}:${term.slug}`, term]),
  );

  for (const definition of taxonomyDefinitions(contract)) {
    const actual = definitionsByName.get(definition.name);
    if (!actual) {
      failures.push(`Missing taxonomy definition: ${definition.name}`);
      continue;
    }

    const expectedCollections = normalizeJsonValue(
      definition.collections ?? [],
    );
    if (
      String(normalizeJsonValue(actual.collections) ?? "") !==
      expectedCollections
    ) {
      failures.push(
        `Taxonomy ${definition.name} collections drift: expected ${expectedCollections}, got ${actual.collections}`,
      );
    }
  }

  for (const term of contract.siteSchema.taxonomyTerms ?? []) {
    const actual = termsByKey.get(`${term.taxonomy}:${term.slug}`);
    if (!actual) {
      failures.push(`Missing taxonomy term: ${term.taxonomy}/${term.slug}`);
      continue;
    }

    if (actual.label !== term.label) {
      failures.push(
        `Taxonomy term ${term.taxonomy}/${term.slug} label drift: expected ${term.label}, got ${actual.label}`,
      );
    }
  }

  return { failures, warnings: [] };
}

export function compareRelationshipSchema(
  contract,
  contentRows,
  taxonomyState,
  bylineState,
) {
  const failures = [];
  const termsByKey = new Map(
    taxonomyState.terms.map((term) => [`${term.name}:${term.slug}`, term]),
  );
  const bylineBySlug = new Map(
    bylineState.bylines.map((row) => [row.slug, row]),
  );

  for (const byline of contract.siteSchema.bylines ?? []) {
    const actual = bylineBySlug.get(byline.slug);
    if (!actual) {
      failures.push(`Missing byline: ${byline.slug}`);
      continue;
    }
    if (actual.display_name !== byline.displayName) {
      failures.push(
        `Byline ${byline.slug} display name drift: expected ${byline.displayName}, got ${actual.display_name}`,
      );
    }
  }

  for (const assignment of contract.siteSchema.taxonomyAssignments ?? []) {
    const rows = contentRows.get(assignment.collection) ?? [];
    const content = rows.find((row) => row.slug === assignment.slug);
    const term = termsByKey.get(
      `${assignment.taxonomy}:${assignment.termSlug}`,
    );
    if (!content || !term) continue;

    const linked = taxonomyState.assignments.some(
      (row) =>
        row.collection === assignment.collection &&
        row.entry_id === content.id &&
        row.taxonomy_id === term.id,
    );

    if (!linked) {
      failures.push(
        `Missing taxonomy assignment: ${assignment.collection}/${assignment.slug} -> ${assignment.taxonomy}/${assignment.termSlug}`,
      );
    }
  }

  for (const assignment of contract.siteSchema.contentBylines ?? []) {
    const rows = contentRows.get(assignment.collection) ?? [];
    const content = rows.find((row) => row.slug === assignment.slug);
    const byline = bylineBySlug.get(assignment.bylineSlug);
    if (!content || !byline) continue;

    const linked = bylineState.assignments.some(
      (row) =>
        row.collection_slug === assignment.collection &&
        row.content_id === content.id &&
        row.byline_id === byline.id,
    );

    if (!linked) {
      failures.push(
        `Missing byline assignment: ${assignment.collection}/${assignment.slug} -> ${assignment.bylineSlug}`,
      );
    }
  }

  return { failures, warnings: [] };
}

export function compareMenuSchema(contract, state) {
  const failures = [];
  const menusByName = new Map(state.menus.map((menu) => [menu.name, menu]));

  for (const expectedMenu of contract.siteSchema.menus ?? []) {
    const menu = menusByName.get(expectedMenu.name);
    if (!menu) {
      failures.push(`Missing menu: ${expectedMenu.name}`);
      continue;
    }

    const items = state.items
      .filter((item) => item.menu_id === menu.id && !item.parent_id)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    for (const [index, expectedItem] of expectedMenu.items.entries()) {
      const item = items[index];
      if (!item) {
        failures.push(
          `Missing menu item ${expectedMenu.name}[${index}]: ${expectedItem.label}`,
        );
        continue;
      }
      const actualUrl = cleanText(item.custom_url);
      if (item.label !== expectedItem.label || actualUrl !== expectedItem.url) {
        failures.push(
          `Menu item ${expectedMenu.name}[${index}] drift: expected ${expectedItem.label} ${expectedItem.url}, got ${item.label} ${actualUrl}`,
        );
      }
    }
  }

  return { failures, warnings: [] };
}

export function compareOptionSchema(contract, options) {
  const failures = [];
  const optionsByName = new Set(options.map((option) => option.name));

  for (const key of Object.keys(contract.seed.settings ?? {})) {
    const optionName = `site:${key}`;
    if (!optionsByName.has(optionName)) {
      failures.push(`Missing site option: ${optionName}`);
    }
  }

  return { failures, warnings: [] };
}

export async function runFullSchemaCheck(db, contract, collections) {
  const failures = [];
  const warnings = [];

  for (const collection of collections) {
    const state = await readCollectionState(db, collection);
    const result = compareCollectionSchema(collection, state);
    failures.push(...result.failures);
    warnings.push(...result.warnings);
  }

  const [taxonomyState, bylineState, menuState, optionState, contentRows] =
    await Promise.all([
      readTaxonomyState(db),
      readBylineState(db),
      readMenuState(db),
      readOptionState(db),
      readContentRows(db, collections),
    ]);

  for (const result of [
    compareTaxonomySchema(contract, taxonomyState),
    compareRelationshipSchema(
      contract,
      contentRows,
      taxonomyState,
      bylineState,
    ),
    compareMenuSchema(contract, menuState),
    compareOptionSchema(contract, optionState),
  ]) {
    failures.push(...result.failures);
    warnings.push(...result.warnings);
  }

  return { failures, warnings };
}
