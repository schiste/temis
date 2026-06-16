#!/usr/bin/env node

import {
  collectionContracts,
  createDbAdapter,
  loadSchemaContract,
  parseArgs,
  runFullSchemaCheck,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const contract = await loadSchemaContract();
const collections = collectionContracts(contract);
const db = createDbAdapter(args);

const { failures, warnings } = await runFullSchemaCheck(
  db,
  contract,
  collections,
);

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
