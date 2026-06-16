#!/usr/bin/env node

import {
  compareToolsSchema,
  createDbAdapter,
  fieldMetadataDiffers,
  fieldMetadata,
  loadToolsSchema,
  parseArgs,
  quoteIdent,
  readToolsState,
  sqlLiteral,
  toolsCollection,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const schema = await loadToolsSchema();
const collection = toolsCollection(schema);
const db = createDbAdapter(args);
const state = await readToolsState(db, collection);

if (!state.collection) {
  console.error(
    `[cms:schema:apply] Missing tools collection in ${args.mode} database. Run the EmDash seed first, then rerun this command.`,
  );
  process.exit(1);
}

const columnsByName = new Map(state.columns.map((row) => [row.name, row]));
const fieldsBySlug = new Map(state.fields.map((row) => [row.slug, row]));
const applied = [];

for (const [index, field] of collection.fields.entries()) {
  if (!columnsByName.has(field.slug)) {
    await db.exec(
      `ALTER TABLE ${quoteIdent(collection.table)} ADD COLUMN ${quoteIdent(
        field.slug,
      )} ${field.columnType}`,
    );
    applied.push(`added column ${collection.table}.${field.slug}`);
  }

  const metadata = fieldMetadata(state.collection.id, field, index);

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
      )}, validation = ${sqlLiteral(metadata.validation)}, widget = ${sqlLiteral(
        metadata.widget,
      )}, options = ${sqlLiteral(metadata.options)}, sort_order = ${sqlLiteral(
        metadata.sort_order,
      )}, searchable = ${sqlLiteral(
        metadata.searchable,
      )}, translatable = ${sqlLiteral(
        metadata.translatable,
      )} WHERE collection_id = ${sqlLiteral(
        state.collection.id,
      )} AND slug = ${sqlLiteral(field.slug)}`,
    );
    applied.push(`updated metadata tools.${field.slug}`);
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
    applied.push(`inserted metadata tools.${field.slug}`);
  }
}

if (applied.length === 0) {
  console.log(`[cms:schema:apply] ${args.mode} tools schema already matches.`);
} else {
  console.log(`[cms:schema:apply] Applied ${applied.length} change(s):`);
  for (const item of applied) {
    console.log(`- ${item}`);
  }
}

const nextState = await readToolsState(db, collection);
const result = compareToolsSchema(collection, nextState);

for (const warning of result.warnings) {
  console.warn(`[cms:schema:apply] warning: ${warning}`);
}

if (result.failures.length > 0) {
  console.error(
    `[cms:schema:apply] ${args.mode} tools schema still has drift after apply:`,
  );
  for (const failure of result.failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[cms:schema:apply] ${args.mode} tools schema matches git.`);
