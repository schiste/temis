#!/usr/bin/env node

import {
  collectionContracts,
  compareCollectionSchema,
  compareMenuSchema,
  compareOptionSchema,
  compareRelationshipSchema,
  compareTaxonomySchema,
  createDbAdapter,
  fieldMetadata,
  fieldMetadataDiffers,
  loadSchemaContract,
  normalizeJsonValue,
  parseArgs,
  quoteIdent,
  readBylineState,
  readCollectionState,
  readContentRows,
  readMenuState,
  readOptionState,
  readTaxonomyState,
  slugify,
  sqlLiteral,
  taxonomyDefinitions,
  taxonomyTermId,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const contract = await loadSchemaContract();
const collections = collectionContracts(contract);
const db = createDbAdapter(args);
const applied = [];

async function applyCollectionSchema(collection) {
  const state = await readCollectionState(db, collection);

  if (!state.collection) {
    console.error(
      `[cms:schema:apply] Missing ${collection.slug} collection in ${args.mode} database. Run the EmDash seed first, then rerun this command.`,
    );
    process.exit(1);
  }

  await db.exec(
    `UPDATE _emdash_collections SET label = ${sqlLiteral(
      collection.label,
    )}, label_singular = ${sqlLiteral(
      collection.labelSingular ?? collection.label_singular,
    )}, description = ${sqlLiteral(
      collection.description ?? null,
    )}, icon = ${sqlLiteral(collection.icon ?? null)}, supports = ${sqlLiteral(
      normalizeJsonValue(collection.supports ?? []),
    )}, url_pattern = ${sqlLiteral(
      collection.urlPattern ?? collection.url_pattern ?? null,
    )}, has_seo = ${sqlLiteral(
      (collection.supports ?? []).includes("seo") ? 1 : 0,
    )}, search_config = ${sqlLiteral(
      JSON.stringify({
        enabled: (collection.supports ?? []).includes("search"),
      }),
    )}, updated_at = datetime('now') WHERE id = ${sqlLiteral(
      state.collection.id,
    )}`,
  );

  const columnsByName = new Map(state.columns.map((row) => [row.name, row]));
  const fieldsBySlug = new Map(state.fields.map((row) => [row.slug, row]));

  for (const [index, field] of collection.fields.entries()) {
    if (!columnsByName.has(field.slug)) {
      await db.exec(
        `ALTER TABLE ${quoteIdent(collection.table)} ADD COLUMN ${quoteIdent(
          field.slug,
        )} ${field.columnType}`,
      );
      applied.push(`added column ${collection.table}.${field.slug}`);
    }

    const metadata = fieldMetadata(
      state.collection.id,
      collection.slug,
      field,
      index,
    );
    const existingMetadata = fieldsBySlug.get(field.slug);

    if (existingMetadata) {
      if (!fieldMetadataDiffers(existingMetadata, metadata)) {
        continue;
      }

      await db.exec(
        `UPDATE _emdash_fields SET label = ${sqlLiteral(
          metadata.label,
        )}, type = ${sqlLiteral(metadata.type)}, column_type = ${sqlLiteral(
          metadata.column_type,
        )}, required = ${sqlLiteral(metadata.required)}, "unique" = ${sqlLiteral(
          metadata.unique,
        )}, default_value = ${sqlLiteral(
          metadata.default_value,
        )}, validation = ${sqlLiteral(
          metadata.validation,
        )}, widget = ${sqlLiteral(metadata.widget)}, options = ${sqlLiteral(
          metadata.options,
        )}, sort_order = ${sqlLiteral(metadata.sort_order)}, searchable = ${sqlLiteral(
          metadata.searchable,
        )}, translatable = ${sqlLiteral(
          metadata.translatable,
        )} WHERE collection_id = ${sqlLiteral(
          state.collection.id,
        )} AND slug = ${sqlLiteral(field.slug)}`,
      );
      applied.push(`updated metadata ${collection.slug}.${field.slug}`);
    } else {
      await db.exec(
        `INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, searchable, translatable) VALUES (${sqlLiteral(
          metadata.id,
        )}, ${sqlLiteral(metadata.collection_id)}, ${sqlLiteral(
          metadata.slug,
        )}, ${sqlLiteral(metadata.label)}, ${sqlLiteral(
          metadata.type,
        )}, ${sqlLiteral(metadata.column_type)}, ${sqlLiteral(
          metadata.required,
        )}, ${sqlLiteral(metadata.unique)}, ${sqlLiteral(
          metadata.default_value,
        )}, ${sqlLiteral(metadata.validation)}, ${sqlLiteral(
          metadata.widget,
        )}, ${sqlLiteral(metadata.options)}, ${sqlLiteral(
          metadata.sort_order,
        )}, ${sqlLiteral(metadata.searchable)}, ${sqlLiteral(
          metadata.translatable,
        )})`,
      );
      applied.push(`inserted metadata ${collection.slug}.${field.slug}`);
    }
  }
}

async function applyTaxonomies() {
  for (const definition of taxonomyDefinitions(contract)) {
    const rows = await db.exec(
      `SELECT * FROM _emdash_taxonomy_defs WHERE name = ${sqlLiteral(
        definition.name,
      )}`,
    );
    const id = rows[0]?.id ?? `taxdef_${definition.name}`;
    const collectionsJson = normalizeJsonValue(definition.collections ?? []);

    if (rows.length === 0) {
      await db.exec(
        `INSERT INTO _emdash_taxonomy_defs (id, name, label, label_singular, hierarchical, collections, translation_group) VALUES (${sqlLiteral(
          id,
        )}, ${sqlLiteral(definition.name)}, ${sqlLiteral(
          definition.label,
        )}, ${sqlLiteral(
          definition.labelSingular ?? definition.label_singular ?? null,
        )}, ${sqlLiteral(
          definition.hierarchical ? 1 : 0,
        )}, ${sqlLiteral(collectionsJson)}, ${sqlLiteral(id)})`,
      );
      applied.push(`inserted taxonomy definition ${definition.name}`);
    } else {
      await db.exec(
        `UPDATE _emdash_taxonomy_defs SET label = ${sqlLiteral(
          definition.label,
        )}, label_singular = ${sqlLiteral(
          definition.labelSingular ?? definition.label_singular ?? null,
        )}, hierarchical = ${sqlLiteral(
          definition.hierarchical ? 1 : 0,
        )}, collections = ${sqlLiteral(
          collectionsJson,
        )} WHERE id = ${sqlLiteral(id)}`,
      );
    }
  }

  for (const term of contract.siteSchema.taxonomyTerms ?? []) {
    const rows = await db.exec(
      `SELECT * FROM taxonomies WHERE name = ${sqlLiteral(
        term.taxonomy,
      )} AND slug = ${sqlLiteral(term.slug)}`,
    );
    const id = rows[0]?.id ?? taxonomyTermId(term);
    const data = {
      accent: term.accent ?? null,
      description: term.description ?? null,
      priority: term.priority ?? null,
    };

    if (rows.length === 0) {
      await db.exec(
        `INSERT INTO taxonomies (id, name, slug, label, parent_id, data, translation_group) VALUES (${sqlLiteral(
          id,
        )}, ${sqlLiteral(term.taxonomy)}, ${sqlLiteral(
          term.slug,
        )}, ${sqlLiteral(term.label)}, NULL, ${sqlLiteral(
          data,
        )}, ${sqlLiteral(id)})`,
      );
      applied.push(`inserted taxonomy term ${term.taxonomy}/${term.slug}`);
    } else {
      await db.exec(
        `UPDATE taxonomies SET label = ${sqlLiteral(
          term.label,
        )}, data = ${sqlLiteral(data)} WHERE id = ${sqlLiteral(id)}`,
      );
    }
  }
}

async function applyBylines() {
  for (const byline of contract.siteSchema.bylines ?? []) {
    const rows = await db.exec(
      `SELECT * FROM _emdash_bylines WHERE slug = ${sqlLiteral(byline.slug)}`,
    );
    const id = rows[0]?.id ?? `schema:byline:${byline.slug}`;

    if (rows.length === 0) {
      await db.exec(
        `INSERT INTO _emdash_bylines (id, slug, display_name, bio, is_guest, translation_group) VALUES (${sqlLiteral(
          id,
        )}, ${sqlLiteral(byline.slug)}, ${sqlLiteral(
          byline.displayName,
        )}, ${sqlLiteral(byline.bio ?? null)}, 1, ${sqlLiteral(id)})`,
      );
      applied.push(`inserted byline ${byline.slug}`);
    } else {
      await db.exec(
        `UPDATE _emdash_bylines SET display_name = ${sqlLiteral(
          byline.displayName,
        )}, bio = ${sqlLiteral(
          byline.bio ?? rows[0].bio ?? null,
        )}, updated_at = datetime('now') WHERE id = ${sqlLiteral(id)}`,
      );
    }
  }
}

async function applyContentDefaults(contentRows) {
  for (const defaults of contract.siteSchema.contentDefaults ?? []) {
    const collection = collections.find(
      (item) => item.slug === defaults.collection,
    );
    const content = (contentRows.get(defaults.collection) ?? []).find(
      (row) => row.slug === defaults.slug,
    );
    if (!collection || !content) continue;

    for (const [field, value] of Object.entries(defaults.fields ?? {})) {
      if (content[field] === value) continue;
      await db.exec(
        `UPDATE ${quoteIdent(collection.table)} SET ${quoteIdent(
          field,
        )} = ${sqlLiteral(value)}, updated_at = datetime('now') WHERE id = ${sqlLiteral(
          content.id,
        )}`,
      );
      applied.push(`updated ${defaults.collection}/${defaults.slug}.${field}`);
    }
  }
}

async function applyRelationships(contentRows) {
  const taxonomyState = await readTaxonomyState(db);
  const bylineState = await readBylineState(db);
  const termsByKey = new Map(
    taxonomyState.terms.map((term) => [`${term.name}:${term.slug}`, term]),
  );
  const bylineBySlug = new Map(
    bylineState.bylines.map((row) => [row.slug, row]),
  );

  for (const assignment of contract.siteSchema.taxonomyAssignments ?? []) {
    const content = (contentRows.get(assignment.collection) ?? []).find(
      (row) => row.slug === assignment.slug,
    );
    const term = termsByKey.get(
      `${assignment.taxonomy}:${assignment.termSlug}`,
    );
    if (!content || !term) continue;

    const exists = taxonomyState.assignments.some(
      (row) =>
        row.collection === assignment.collection &&
        row.entry_id === content.id &&
        row.taxonomy_id === term.id,
    );
    if (exists) continue;

    await db.exec(
      `INSERT INTO content_taxonomies (collection, entry_id, taxonomy_id) VALUES (${sqlLiteral(
        assignment.collection,
      )}, ${sqlLiteral(content.id)}, ${sqlLiteral(term.id)})`,
    );
    applied.push(
      `assigned ${assignment.collection}/${assignment.slug} to ${assignment.taxonomy}/${assignment.termSlug}`,
    );
  }

  for (const assignment of contract.siteSchema.contentBylines ?? []) {
    const collection = collections.find(
      (item) => item.slug === assignment.collection,
    );
    const content = (contentRows.get(assignment.collection) ?? []).find(
      (row) => row.slug === assignment.slug,
    );
    const byline = bylineBySlug.get(assignment.bylineSlug);
    if (!collection || !content || !byline) continue;

    const exists = bylineState.assignments.some(
      (row) =>
        row.collection_slug === assignment.collection &&
        row.content_id === content.id &&
        row.byline_id === byline.id,
    );

    if (!exists) {
      await db.exec(
        `INSERT INTO _emdash_content_bylines (id, collection_slug, content_id, byline_id, sort_order, role_label) VALUES (${sqlLiteral(
          `schema:content-byline:${assignment.collection}:${assignment.slug}:${assignment.bylineSlug}`,
        )}, ${sqlLiteral(assignment.collection)}, ${sqlLiteral(
          content.id,
        )}, ${sqlLiteral(byline.id)}, 0, ${sqlLiteral(
          assignment.roleLabel ?? "Author",
        )})`,
      );
      applied.push(
        `assigned ${assignment.collection}/${assignment.slug} to byline ${assignment.bylineSlug}`,
      );
    }

    if (content.primary_byline_id !== byline.id) {
      await db.exec(
        `UPDATE ${quoteIdent(
          collection.table,
        )} SET primary_byline_id = ${sqlLiteral(
          byline.id,
        )}, updated_at = datetime('now') WHERE id = ${sqlLiteral(content.id)}`,
      );
      applied.push(
        `updated ${assignment.collection}/${assignment.slug}.primary_byline_id`,
      );
    }
  }
}

async function applyMenus() {
  for (const expectedMenu of contract.siteSchema.menus ?? []) {
    const menuRows = await db.exec(
      `SELECT * FROM _emdash_menus WHERE name = ${sqlLiteral(expectedMenu.name)}`,
    );
    const menuId = menuRows[0]?.id ?? `schema:menu:${expectedMenu.name}`;

    if (menuRows.length === 0) {
      await db.exec(
        `INSERT INTO _emdash_menus (id, name, label, translation_group) VALUES (${sqlLiteral(
          menuId,
        )}, ${sqlLiteral(expectedMenu.name)}, ${sqlLiteral(
          expectedMenu.label,
        )}, ${sqlLiteral(menuId)})`,
      );
      applied.push(`inserted menu ${expectedMenu.name}`);
    } else {
      await db.exec(
        `UPDATE _emdash_menus SET label = ${sqlLiteral(
          expectedMenu.label,
        )}, updated_at = datetime('now') WHERE id = ${sqlLiteral(menuId)}`,
      );
    }

    const itemRows = await db.exec(
      `SELECT * FROM _emdash_menu_items WHERE menu_id = ${sqlLiteral(
        menuId,
      )} AND parent_id IS NULL ORDER BY sort_order, label`,
    );

    for (const [index, expectedItem] of expectedMenu.items.entries()) {
      const existing =
        itemRows.find(
          (item) =>
            item.custom_url === expectedItem.url ||
            item.label === expectedItem.label,
        ) ?? itemRows[index];
      const itemId =
        existing?.id ??
        `schema:menu-item:${expectedMenu.name}:${slugify(expectedItem.label)}`;

      if (existing) {
        await db.exec(
          `UPDATE _emdash_menu_items SET sort_order = ${sqlLiteral(
            index,
          )}, type = 'custom', reference_collection = NULL, reference_id = NULL, custom_url = ${sqlLiteral(
            expectedItem.url,
          )}, label = ${sqlLiteral(expectedItem.label)} WHERE id = ${sqlLiteral(
            itemId,
          )}`,
        );
      } else {
        await db.exec(
          `INSERT INTO _emdash_menu_items (id, menu_id, parent_id, sort_order, type, custom_url, label, translation_group) VALUES (${sqlLiteral(
            itemId,
          )}, ${sqlLiteral(menuId)}, NULL, ${sqlLiteral(
            index,
          )}, 'custom', ${sqlLiteral(expectedItem.url)}, ${sqlLiteral(
            expectedItem.label,
          )}, ${sqlLiteral(itemId)})`,
        );
        applied.push(
          `inserted menu item ${expectedMenu.name}/${expectedItem.label}`,
        );
      }
    }
  }
}

async function applyOptions() {
  const existing = new Set((await readOptionState(db)).map((row) => row.name));

  for (const [key, value] of Object.entries(contract.seed.settings ?? {})) {
    const optionName = `site:${key}`;
    if (existing.has(optionName)) continue;
    await db.exec(
      `INSERT INTO options (name, value) VALUES (${sqlLiteral(
        optionName,
      )}, ${sqlLiteral(JSON.stringify(value))})`,
    );
    applied.push(`inserted option ${optionName}`);
  }
}

for (const collection of collections) {
  await applyCollectionSchema(collection);
}

await applyTaxonomies();
await applyBylines();
let contentRows = await readContentRows(db, collections);
await applyContentDefaults(contentRows);
contentRows = await readContentRows(db, collections);
await applyRelationships(contentRows);
await applyMenus();
await applyOptions();

const failures = [];
const warnings = [];

for (const collection of collections) {
  const state = await readCollectionState(db, collection);
  const result = compareCollectionSchema(collection, state);
  failures.push(...result.failures);
  warnings.push(...result.warnings);
}

const [taxonomyState, bylineState, menuState, optionState, nextContentRows] =
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
    nextContentRows,
    taxonomyState,
    bylineState,
  ),
  compareMenuSchema(contract, menuState),
  compareOptionSchema(contract, optionState),
]) {
  failures.push(...result.failures);
  warnings.push(...result.warnings);
}

if (applied.length === 0) {
  console.log(`[cms:schema:apply] ${args.mode} schema already matches.`);
} else {
  console.log(`[cms:schema:apply] Applied ${applied.length} change(s):`);
  for (const item of applied) {
    console.log(`- ${item}`);
  }
}

for (const warning of warnings) {
  console.warn(`[cms:schema:apply] warning: ${warning}`);
}

if (failures.length > 0) {
  console.error(
    `[cms:schema:apply] ${args.mode} schema still has drift after apply:`,
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[cms:schema:apply] ${args.mode} schema matches git.`);
