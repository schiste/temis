import { readFile } from "node:fs/promises";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const targetPath = path.resolve(
  siteRoot,
  process.argv[2] ?? "dist/tools/wiki-polis/index.html",
);

function fail(message) {
  console.error(`[graph-navigation] ${message}`);
  process.exit(1);
}

function uniqueMatches(source, pattern) {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

const html = await readFile(targetPath, "utf8");

if (html.includes("temis-graph-nav--compact")) {
  fail("Expected full graph navigation on the tool page, found compact graph.");
}

if (html.includes("temis-graph-nav__index")) {
  fail("Expected full graph navigation without compact index labels.");
}

if (!html.includes("ds-content-rail")) {
  fail("Expected graph navigation in the content sidebar.");
}

if (html.includes("ds-content-graph")) {
  fail("Expected sidebar graph navigation, found full-width graph section.");
}

if (!html.includes("temis-graph-nav__node-label")) {
  fail("Expected visible full graph node labels.");
}

const nodeIds = uniqueMatches(html, /data-node-id="([^"]+)"/g);
const detailNodeIds = uniqueMatches(html, /data-detail-node-id="([^"]+)"/g);
const previewNodeIds = uniqueMatches(html, /data-preview-node-id="([^"]+)"/g);
const currentNodeIds = uniqueMatches(
  html,
  /<a\s+class="[^"]*\btemis-graph-nav__node\b[^"]*\btemis-graph-nav__node--current\b[^"]*"[^>]*data-node-id="([^"]+)"/g,
);
const edgeCount = [...html.matchAll(/data-edge-source="[^"]+"/g)].length;

if (nodeIds.size < 2) {
  fail(`Expected at least 2 graph nodes, found ${nodeIds.size}.`);
}

if (edgeCount < 1) {
  fail("Expected at least 1 graph edge.");
}

for (const nodeId of nodeIds) {
  if (!detailNodeIds.has(nodeId)) {
    fail(`Missing detail panel for node ${nodeId}.`);
  }
}

if (currentNodeIds.size !== 1) {
  fail(`Expected 1 current graph node, found ${currentNodeIds.size}.`);
}

const [currentNodeId] = currentNodeIds;

for (const nodeId of previewNodeIds) {
  if (!nodeIds.has(nodeId)) {
    fail(`Preview card references unknown node ${nodeId}.`);
  }
}

if (previewNodeIds.has(currentNodeId)) {
  fail("Current page node should not render a preview card.");
}

if (previewNodeIds.size !== nodeIds.size - 1) {
  fail(
    `Expected preview cards for ${nodeIds.size - 1} non-current nodes, found ${previewNodeIds.size}.`,
  );
}

if (!html.includes('aria-expanded="true"')) {
  fail("Expected one initially expanded graph node.");
}

console.log(
  `[graph-navigation] OK ${nodeIds.size} nodes, ${edgeCount} edges, ${detailNodeIds.size} detail panels, ${previewNodeIds.size} preview cards`,
);
