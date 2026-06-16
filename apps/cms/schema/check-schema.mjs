#!/usr/bin/env node

import {
  collectionContracts,
  compareCollectionSchema,
  compareMenuSchema,
  compareOptionSchema,
  compareRelationshipSchema,
  compareTaxonomySchema,
  createDbAdapter,
  loadSchemaContract,
  parseArgs,
  readBylineState,
  readCollectionState,
  readContentRows,
  readMenuState,
  readOptionState,
  readTaxonomyState,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const contract = await loadSchemaContract();
const collections = collectionContracts(contract);
const db = createDbAdapter(args);
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
  compareRelationshipSchema(contract, contentRows, taxonomyState, bylineState),
  compareMenuSchema(contract, menuState),
  compareOptionSchema(contract, optionState),
]) {
  failures.push(...result.failures);
  warnings.push(...result.warnings);
}

for (const warning of warnings) {
  console.warn(`[cms:schema:check] warning: ${warning}`);
}

if (failures.length > 0) {
  console.error(`[cms:schema:check] ${args.mode} schema drift detected:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[cms:schema:check] ${args.mode} schema matches git (${collections.length} collections).`,
);
