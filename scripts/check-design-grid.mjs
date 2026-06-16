import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

const files = {
  components: "packages/design-system/src/styles/components.css",
  graphNavigation:
    "packages/graph-navigation/src/components/GraphNavigation.astro",
};

function fail(message) {
  console.error(`[design-grid] ${message}`);
  process.exit(1);
}

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    fail(`Missing ${label}: ${expected}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    fail(`Missing ${label}.`);
  }
}

const [componentsCss, graphNavigationAstro] = await Promise.all([
  readRepoFile(files.components),
  readRepoFile(files.graphNavigation),
]);

const combinedSource = `${componentsCss}\n${graphNavigationAstro}`;
const forbiddenLegacyTokens = [
  "--ds-space-3xs",
  "--ds-color-text-soft",
  "--ds-font-size-step-1",
  "--ds-font-size-micro",
  "--ds-line-height-tight",
  "--ds-color-link",
];

for (const token of forbiddenLegacyTokens) {
  if (combinedSource.includes(token)) {
    fail(`Found legacy or undefined token ${token}.`);
  }
}

assertMatches(
  componentsCss,
  /\.ds-prose--article\s*{[^}]*inline-size:\s*min\(100%,\s*var\(--ds-measure-article\)\)/s,
  "article prose measure",
);

assertMatches(
  componentsCss,
  /\.ds-content-main\s+\.ds-lede\s*{[^}]*inline-size:\s*min\(100%,\s*var\(--ds-measure-article\)\)/s,
  "content-page lede measure",
);

assertMatches(
  componentsCss,
  /\.ds-tool-prose\s*{[^}]*inline-size:\s*min\(100%,\s*var\(--ds-measure-article\)\)/s,
  "tool prose measure",
);

assertMatches(
  componentsCss,
  /\.ds-meta-row\s*{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(var\(--ds-grid-unit\),\s*1fr\)\)/s,
  "metadata row grid columns",
);

assertIncludes(
  componentsCss,
  ".ds-prose > * + * {\n  margin-block-start: var(--ds-row-half);",
  "prose row-derived rhythm",
);

assertIncludes(
  graphNavigationAstro,
  "min-height: calc(var(--ds-row-unit, var(--ds-grid-unit, 2.625rem)) * 8);",
  "graph map row-derived minimum height",
);

console.log("[design-grid] OK content detail measures use the golden grid");
