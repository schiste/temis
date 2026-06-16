#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatContentQualityIssues,
  validateContentQuality,
} from "@temis/content-quality";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const seedPath = path.join(root, "apps/cms/.emdash/seed.json");
const snapshotPath = path.join(
  root,
  "apps/site/.generated/emdash-snapshot.json",
);

const checkedCollections = ["pages", "posts", "tools"];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isPublished(row) {
  return row?.status === "published" && row.deleted_at == null;
}

function seedRecords(seed) {
  const records = [];

  for (const collection of checkedCollections) {
    const entries = seed.content?.[collection] ?? [];
    for (const entry of entries) {
      if (!isPublished(entry)) continue;
      records.push({
        collection,
        content: {
          id: entry.id,
          slug: entry.slug,
          status: entry.status,
          ...(isRecord(entry.data) ? entry.data : {}),
        },
        source: "seed",
      });
    }
  }

  return records;
}

function snapshotRecords(snapshot) {
  const records = [];
  const tables = snapshot.tables ?? {};

  for (const collection of checkedCollections) {
    const table = tables[`ec_${collection}`] ?? [];
    for (const row of table) {
      if (!isPublished(row)) continue;

      const parsed = {};
      for (const [key, value] of Object.entries(row)) {
        parsed[key] = parseMaybeJson(value);
      }

      records.push({
        collection,
        content: parsed,
        relationships: relationshipState(snapshot, collection, parsed),
        source: "snapshot",
      });
    }
  }

  return records;
}

function relationshipState(snapshot, collection, content) {
  const tables = snapshot.tables ?? {};
  const contentId = String(content.id ?? "");
  const contentBylines = tables._emdash_content_bylines ?? [];
  const taxonomyAssignments = [
    ...(tables._emdash_taxonomy_assignments ?? []),
    ...(tables.taxonomy_assignments ?? []),
    ...(tables._emdash_content_taxonomies ?? []),
  ];

  return {
    authorLinked: contentBylines.some(
      (row) =>
        row?.collection_slug === collection &&
        row?.content_id === contentId &&
        typeof row?.byline_id === "string" &&
        row.byline_id.length > 0,
    ),
    topicOrTagAssigned: taxonomyAssignments.some((row) => {
      const rowCollection = row?.collection_slug ?? row?.collection;
      const rowContentId = row?.content_id ?? row?.entry_id ?? row?.record_id;
      return rowCollection === collection && rowContentId === contentId;
    }),
  };
}

const inputs = [
  ...seedRecords(await readJson(seedPath)),
  ...snapshotRecords(await readJson(snapshotPath)),
];

const failures = [];
const warnings = [];

for (const input of inputs) {
  const result = validateContentQuality({
    collection: input.collection,
    content: input.content,
    mode: "publish",
    relationships: input.relationships,
  });

  if (result.errors.length > 0) {
    failures.push({
      source: input.source,
      result,
    });
  }

  if (result.warnings.length > 0) {
    warnings.push({
      source: input.source,
      result: {
        ...result,
        errors: [],
        issues: result.warnings,
      },
    });
  }
}

for (const warning of warnings) {
  console.warn(
    `[content:check] warning in ${warning.source}: ${formatContentQualityIssues(
      warning.result,
    )}`,
  );
}

if (failures.length > 0) {
  console.error("[content:check] Content quality failures detected:");
  for (const failure of failures) {
    console.error(
      `[content:check] ${failure.source}: ${formatContentQualityIssues(
        failure.result,
      )}`,
    );
  }
  process.exit(1);
}

console.log(
  `[content:check] ${inputs.length} published content records passed quality checks.`,
);
