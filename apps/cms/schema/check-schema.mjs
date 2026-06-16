#!/usr/bin/env node

import {
  compareToolsSchema,
  createDbAdapter,
  loadToolsSchema,
  parseArgs,
  readToolsState,
  toolsCollection,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const schema = await loadToolsSchema();
const collection = toolsCollection(schema);
const db = createDbAdapter(args);
const state = await readToolsState(db, collection);
const result = compareToolsSchema(collection, state);

for (const warning of result.warnings) {
  console.warn(`[cms:schema:check] warning: ${warning}`);
}

if (result.failures.length > 0) {
  console.error(`[cms:schema:check] ${args.mode} tools schema drift detected:`);
  for (const failure of result.failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[cms:schema:check] ${args.mode} tools schema matches git.`);
