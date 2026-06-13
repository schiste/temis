#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const outputPath = path.join(siteRoot, ".generated", "emdash-snapshot.json");

function env(name) {
  return process.env[name];
}

function resolveSnapshotUrl() {
  const explicit = env("EMDASH_SNAPSHOT_URL");
  if (explicit) return explicit;

  const baseUrl = env("EMDASH_BASE_URL");
  if (!baseUrl) {
    throw new Error(
      "Set EMDASH_SNAPSHOT_URL or EMDASH_BASE_URL before pulling a snapshot.",
    );
  }

  return new URL("/_emdash/api/snapshot", baseUrl).toString();
}

function buildPreviewHeader(source, secret) {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const payload = `${source}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${source}:${exp}:${sig}`;
}

function assertJsonResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Snapshot endpoint returned non-JSON (${response.status} ${contentType || "no content-type"}).`,
    );
  }
}

const snapshotUrl = new URL(resolveSnapshotUrl());
const source = env("EMDASH_PREVIEW_SOURCE") ?? "temis-static-build";
const secret = env("EMDASH_PREVIEW_SECRET") ?? env("PREVIEW_SECRET");

const headers = {
  Accept: "application/json",
};

if (secret) {
  headers["X-Preview-Signature"] = buildPreviewHeader(source, secret);
}

const response = await fetch(snapshotUrl, { headers });
if (!response.ok) {
  throw new Error(
    `Snapshot request failed: ${response.status} ${response.statusText}`,
  );
}

assertJsonResponse(response);

const json = await response.json();
const snapshot = json?.data;

if (
  !snapshot ||
  typeof snapshot !== "object" ||
  !snapshot.tables ||
  !snapshot.schema
) {
  throw new Error("Snapshot response did not match the expected EmDash shape.");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

console.log(`Snapshot written to ${outputPath}`);
console.log(
  `Exported ${Object.keys(snapshot.tables).length} tables at ${snapshot.generatedAt}`,
);
