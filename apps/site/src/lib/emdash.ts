import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  enrichToolsWithGithubData,
  type ToolGithubData,
} from "@temis/tool-github-data";

export interface SnapshotRow {
  [key: string]: unknown;
  id?: string;
  slug?: string | null;
  status?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
}

interface SnapshotData {
  generatedAt?: string;
  schema?: Record<string, unknown>;
  tables: Record<string, SnapshotRow[]>;
}

interface OptionRow extends SnapshotRow {
  name?: string;
  value?: unknown;
}

export interface BylineEntry extends SnapshotRow {
  bio?: string | null;
  display_name: string;
  slug: string;
  website_url?: string | null;
}

export interface PageEntry extends SnapshotRow {
  content?: unknown;
  seo_description?: string;
  seo_title?: string;
  summary?: string;
  title: string;
}

export interface PostEntry extends SnapshotRow {
  author_name?: string;
  content?: unknown;
  content_type?: string | null;
  excerpt?: string;
  featured_image_alt?: string | null;
  featured_image_caption?: string | null;
  featured_image_license?: string | null;
  content_license?: string | null;
  content_license_url?: string | null;
  primary_byline_id?: string | null;
  seo_description?: string;
  seo_title?: string;
  source_title?: string | null;
  source_url?: string | null;
  title: string;
}

export interface ToolEntry extends SnapshotRow {
  description?: unknown;
  documentation_url?: string | null;
  editorial_confidence?: string | null;
  featured_image?: unknown;
  graph_priority?: number | null;
  graph_visible?: boolean | number | null;
  license?: string | null;
  maturity?: string | null;
  privacy_note?: string | null;
  primary_byline_id?: string | null;
  related_articles?: unknown;
  related_people?: unknown;
  repository_url?: string | null;
  screenshot_alt?: string | null;
  screenshot_caption?: string | null;
  screenshot_license?: string | null;
  screenshot_url?: string | null;
  seo_description?: string;
  seo_title?: string;
  summary?: string;
  technical_maturity?: string | null;
  title: string;
  tool_url?: string | null;
  github?: ToolGithubData | null;
}

interface MenuRow extends SnapshotRow {
  id: string;
  label?: string;
  name?: string;
}

interface MenuItemRow extends SnapshotRow {
  custom_url?: string | null;
  label?: string | null;
  menu_id?: string;
  parent_id?: string | null;
  reference_collection?: string | null;
  reference_id?: string | null;
  sort_order?: number | null;
  type?: string | null;
}

export interface SiteNavItem {
  activePrefix?: string;
  href: string;
  label: string;
}

export interface SearchDocument {
  description: string;
  href: string;
  kind: string;
  title: string;
}

type SiteOptions = Record<string, string>;

const defaultSnapshotPath = path.resolve(
  process.cwd(),
  ".generated/emdash-snapshot.json",
);

let cachedSnapshot: SnapshotData | null = null;
let cachedTools: ToolEntry[] | null = null;

function snapshotPath() {
  return (
    process.env.TEMIS_SNAPSHOT_PATH ??
    process.env.EMDASH_SNAPSHOT_PATH ??
    defaultSnapshotPath
  );
}

async function readSnapshot(): Promise<SnapshotData> {
  if (cachedSnapshot) return cachedSnapshot;

  const raw = await readFile(snapshotPath(), "utf8");
  const parsed = JSON.parse(raw) as SnapshotData;

  if (!parsed || typeof parsed !== "object" || !parsed.tables) {
    throw new Error(`Invalid EmDash snapshot at ${snapshotPath()}`);
  }

  overlayNativeSeo(parsed);

  cachedSnapshot = parsed;
  return parsed;
}

const CONTENT_TABLE_PREFIX = "ec_";

function collectionTable(collection: string) {
  return `${CONTENT_TABLE_PREFIX}${collection}`;
}

/**
 * SEO is authored in EmDash's native panel and stored in `_emdash_seo`, keyed
 * by (collection slug, content id). Project the native title/description onto
 * each content row's `seo_title` / `seo_description` so the rest of this module
 * keeps reading them uniformly. Falls back to any value already on the row when
 * no native record exists, which keeps pre-migration snapshots working.
 */
function overlayNativeSeo(snapshot: SnapshotData) {
  const seoRows = snapshot.tables["_emdash_seo"] ?? [];
  if (seoRows.length === 0) return;

  const seoByKey = new Map<string, SnapshotRow>();
  for (const seo of seoRows) {
    seoByKey.set(`${seo.collection}:${seo.content_id}`, seo);
  }

  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (!table.startsWith(CONTENT_TABLE_PREFIX)) continue;
    const collection = table.slice(CONTENT_TABLE_PREFIX.length);
    for (const row of rows) {
      const native = seoByKey.get(`${collection}:${row.id}`);
      if (!native) continue;
      row.seo_title = native.seo_title ?? row.seo_title;
      row.seo_description = native.seo_description ?? row.seo_description;
    }
  }
}

function systemRows<T extends SnapshotRow>(
  snapshot: SnapshotData,
  table: string,
) {
  return (snapshot.tables[table] ?? []) as T[];
}

function parseJsonFields<T extends SnapshotRow>(row: T): T {
  const parsed = { ...row };

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;

    try {
      (parsed as Record<string, unknown>)[key] = JSON.parse(trimmed);
    } catch {
      // EmDash stores some fields as strings; leave non-JSON strings unchanged.
    }
  }

  return parsed;
}

function parseOptionValue(value: unknown) {
  if (typeof value !== "string") return value == null ? "" : String(value);

  try {
    const parsed = JSON.parse(value);
    return parsed == null ? "" : String(parsed);
  } catch {
    return value;
  }
}

function isPublished(row: SnapshotRow) {
  if (row.status !== "published") return false;
  return row.deleted_at === null || row.deleted_at === undefined;
}

function publicSlug(row: SnapshotRow) {
  return typeof row.slug === "string" ? row.slug.replace(/^\/+|\/+$/g, "") : "";
}

function normalizeHref(href: string) {
  if (!href.trim()) return "";
  if (href === "/") return href;
  const prefixed = href.startsWith("/") ? href : `/${href}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function activePrefixFor(href: string) {
  return href === "/" ? undefined : href;
}

function byNewest(a: SnapshotRow, b: SnapshotRow) {
  const bDate = String(b.published_at ?? b.updated_at ?? b.created_at ?? "");
  const aDate = String(a.published_at ?? a.updated_at ?? a.created_at ?? "");
  return bDate.localeCompare(aDate);
}

export async function getCollection<T extends SnapshotRow>(
  collection: string,
): Promise<T[]> {
  const snapshot = await readSnapshot();
  const rows = snapshot.tables[collectionTable(collection)] ?? [];
  return rows.filter(isPublished).map((row) => parseJsonFields(row) as T);
}

export async function getSnapshotTable<T extends SnapshotRow>(
  table: string,
): Promise<T[]> {
  const snapshot = await readSnapshot();
  return systemRows<T>(snapshot, table).map((row) => parseJsonFields(row) as T);
}

export async function getPages() {
  const pages = await getCollection<PageEntry>("pages");
  return pages
    .filter((page) => {
      const slug = publicSlug(page);
      return slug.length > 0 && slug !== "home" && slug !== "index";
    })
    .sort((a, b) => publicSlug(a).localeCompare(publicSlug(b)));
}

export async function getSiteOptions(): Promise<SiteOptions> {
  const snapshot = await readSnapshot();
  const options: SiteOptions = {};

  for (const row of systemRows<OptionRow>(snapshot, "options")) {
    if (!row.name) continue;
    const key = row.name.replace(/^site:/, "");
    options[key] = parseOptionValue(row.value);
  }

  return options;
}

export async function getSiteTexts<T extends Record<string, string>>(
  defaults: T,
): Promise<T> {
  const options = await getSiteOptions();
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      optionValue(options, key, fallback),
    ]),
  ) as T;
}

export async function getBylines() {
  const [options, posts, snapshot] = await Promise.all([
    getSiteOptions(),
    getPosts(),
    readSnapshot(),
  ]);
  const bylines = new Map<string, BylineEntry>();

  for (const row of systemRows<BylineEntry>(snapshot, "_emdash_bylines")) {
    const slug = entryBylineSlug(row);
    bylines.set(slug, withAuthorBioOption(row, options));
  }

  for (const post of posts) {
    const authorName = entryAuthorName(post);
    if (!authorName) continue;
    const slug = slugify(authorName);
    if (bylines.has(slug)) continue;
    bylines.set(
      slug,
      withAuthorBioOption(
        {
          display_name: authorName,
          id: `author:${slug}`,
          slug,
        },
        options,
      ),
    );
  }

  return [...bylines.values()].sort((a, b) =>
    entryBylineName(a).localeCompare(entryBylineName(b)),
  );
}

export async function getBylineBySlug(slug: string) {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  const bylines = await getBylines();
  return (
    bylines.find((byline) => entryBylineSlug(byline) === normalized) ?? null
  );
}

function optionValue(options: SiteOptions, key: string, fallback: string) {
  const value = options[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function withAuthorBioOption(row: BylineEntry, options: SiteOptions) {
  const slug = entryBylineSlug(row);
  return {
    ...row,
    bio: optionValue(options, `authorBio:${slug}`, row.bio ?? ""),
  };
}

const explicitRoutePageSlugs = new Set([
  "about",
  "blog",
  "people",
  "search",
  "topics",
]);

export async function getCatchAllPages() {
  const pages = await getPages();
  return pages.filter((page) => !explicitRoutePageSlugs.has(publicSlug(page)));
}

export async function getHomePage() {
  const pages = await getCollection<PageEntry>("pages");
  return (
    pages.find((page) => ["home", "index", ""].includes(publicSlug(page))) ??
    pages.find((page) => publicSlug(page) === "homepage") ??
    null
  );
}

export async function getPageBySlug(slug: string) {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  const pages = await getPages();
  return pages.find((page) => publicSlug(page) === normalized) ?? null;
}

export async function getPosts() {
  const posts = await getCollection<PostEntry>("posts");
  return posts.sort(byNewest);
}

export async function getPostBySlug(slug: string) {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  const posts = await getPosts();
  return posts.find((post) => publicSlug(post) === normalized) ?? null;
}

export async function getTools() {
  if (cachedTools) return cachedTools;

  const tools = await getCollection<ToolEntry>("tools");
  const sortedTools = tools.sort((a, b) =>
    entryTitle(a).localeCompare(entryTitle(b)),
  );
  const enrichedTools = await enrichToolsWithGithubData(sortedTools, {
    disabled: process.env.TEMIS_GITHUB_FETCH_DISABLED === "1",
    token: process.env.TEMIS_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN,
  });
  cachedTools = enrichedTools;
  return enrichedTools;
}

export async function getToolBySlug(slug: string) {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  const tools = await getTools();
  return tools.find((tool) => publicSlug(tool) === normalized) ?? null;
}

export async function getPostsByAuthorSlug(slug: string) {
  const byline = await getBylineBySlug(slug);
  const posts = await getPosts();
  return posts.filter((post) => {
    if (byline && post.primary_byline_id === byline.id) return true;
    const authorName = entryAuthorName(post);
    return authorName ? slugify(authorName) === slug : false;
  });
}

export async function getSearchDocuments(): Promise<SearchDocument[]> {
  const [pages, posts, tools, bylines] = await Promise.all([
    getPages(),
    getPosts(),
    getTools(),
    getBylines(),
  ]);

  return [
    ...pages.map((page) => ({
      description: entryDescription(page),
      href: `/${entrySlug(page)}/`,
      kind: "Page",
      title: entryTitle(page),
    })),
    ...posts.map((post) => ({
      description: entryDescription(post),
      href: blogHref(post),
      kind: entryContentType(post),
      title: entryTitle(post),
    })),
    ...tools.map((tool) => ({
      description: entryDescription(tool) || entrySummary(tool),
      href: toolHref(tool),
      kind: "Tool",
      title: entryTitle(tool),
    })),
    ...bylines.map((byline) => ({
      description: entryBylineBio(byline),
      href: entryBylineHref(byline),
      kind: "Person",
      title: entryBylineName(byline),
    })),
  ].sort((a, b) => a.title.localeCompare(b.title));
}

const COLLECTION_ROUTE_PREFIX: Record<string, string> = {
  posts: "/blog",
  tools: "/tools",
};

export function collectionHref(
  collection: string | null | undefined,
  slug: string,
) {
  const prefix = collection ? COLLECTION_ROUTE_PREFIX[collection] : undefined;
  return prefix ? `${prefix}/${slug}/` : `/${slug}/`;
}

export function blogHref(post: SnapshotRow) {
  return collectionHref("posts", entrySlug(post));
}

export function toolHref(tool: SnapshotRow) {
  return collectionHref("tools", entrySlug(tool));
}

function referencedHref(
  collection: string | null | undefined,
  row: SnapshotRow,
) {
  const slug = publicSlug(row);
  if (!slug || slug === "home" || slug === "index") return "/";
  return collectionHref(collection, slug);
}

function referencedTitle(row: SnapshotRow) {
  return String(row.title ?? row.name ?? row.slug ?? "Untitled");
}

async function resolveMenuItem(
  item: MenuItemRow,
  snapshot: SnapshotData,
): Promise<SiteNavItem | null> {
  if (item.type === "custom") {
    const href = normalizeHref(String(item.custom_url ?? ""));
    if (!href) return null;
    return {
      activePrefix: activePrefixFor(href),
      href,
      label: String(item.label ?? href),
    };
  }

  const collection = item.reference_collection;
  const referenceId = item.reference_id;
  if (!collection || !referenceId) return null;

  const reference = systemRows<SnapshotRow>(
    snapshot,
    collectionTable(collection),
  ).find((row) => row.id === referenceId);

  if (!reference || !isPublished(reference)) return null;

  const href = referencedHref(collection, reference);
  return {
    activePrefix: activePrefixFor(href),
    href,
    label: String(item.label ?? referencedTitle(reference)),
  };
}

const defaultPrimaryNavItems: SiteNavItem[] = [
  { href: "/blog/", label: "Essays", activePrefix: "/blog/" },
  { href: "/topics/", label: "Topics", activePrefix: "/topics/" },
  { href: "/people/", label: "People", activePrefix: "/people/" },
  { href: "/about/", label: "About", activePrefix: "/about/" },
];

export async function getPrimaryNavItems(menuName = "primary") {
  const snapshot = await readSnapshot();
  const menu = systemRows<MenuRow>(snapshot, "_emdash_menus").find(
    (row) => row.name === menuName,
  );

  if (!menu) return defaultPrimaryNavItems;

  const menuItems = systemRows<MenuItemRow>(snapshot, "_emdash_menu_items")
    .filter((item) => item.menu_id === menu.id && !item.parent_id)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

  const resolved = (
    await Promise.all(menuItems.map((item) => resolveMenuItem(item, snapshot)))
  ).filter((item): item is SiteNavItem => Boolean(item));

  return resolved.length >= defaultPrimaryNavItems.length
    ? resolved.slice(0, defaultPrimaryNavItems.length)
    : defaultPrimaryNavItems;
}

export async function getSiteChrome() {
  const [homePage, aboutPage, navItems, options] = await Promise.all([
    getHomePage(),
    getPageBySlug("about"),
    getPrimaryNavItems(),
    getSiteOptions(),
  ]);

  const brandLabel = optionValue(
    options,
    "siteTitle",
    homePage ? entryTitle(homePage) : "TEMIS",
  );
  const tagline = optionValue(
    options,
    "siteTagline",
    homePage
      ? entrySummary(homePage)
      : "Exploring open knowledge in a post-AI world",
  );
  const aboutSummary = aboutPage ? entrySummary(aboutPage) : "";

  return {
    footer: {
      commonsHeading: optionValue(
        options,
        "footerCommonsHeading",
        aboutPage ? entryTitle(aboutPage) : "Built for the commons",
      ),
      commonsMarkAriaLabel: optionValue(
        options,
        "footerCommonsMarkAriaLabel",
        "Commons frame mark",
      ),
      commonsText: optionValue(
        options,
        "footerCommonsText",
        aboutSummary ||
          "TEMIS is a public resource. Contribute, share, improve.",
      ),
      footerAriaLabel: optionValue(options, "footerAriaLabel", "Site footer"),
      licenseAriaLabel: optionValue(
        options,
        "footerLicenseAriaLabel",
        `${optionValue(options, "footerLicenseLabel", "CC BY-SA 4.0")} license`,
      ),
      licenseHeading: optionValue(options, "footerLicenseHeading", "License"),
      licenseLabel: optionValue(options, "footerLicenseLabel", "CC BY-SA 4.0"),
      licenseMarkLabel: optionValue(options, "footerLicenseMarkLabel", "CC"),
      licensePrefix: optionValue(
        options,
        "footerLicensePrefix",
        "Content on TEMIS is licensed under",
      ),
      licenseUrl: optionValue(
        options,
        "footerLicenseUrl",
        "https://creativecommons.org/licenses/by-sa/4.0/",
      ),
      openHeading: optionValue(options, "footerOpenHeading", "Open by default"),
      openText: optionValue(
        options,
        "footerOpenText",
        "No tracking. No profiling. Just public knowledge.",
      ),
      siteHeading: optionValue(options, "footerSiteHeading", brandLabel),
      siteText: optionValue(
        options,
        "footerSiteText",
        tagline || "A working group exploring the future of open knowledge.",
      ),
      topAriaLabel: optionValue(options, "footerTopAriaLabel", "Back to top"),
      topLabel: optionValue(options, "footerTopLabel", "Top"),
    },
    header: {
      actions: [
        {
          href: optionValue(options, "headerSearchHref", "/search/"),
          icon: "search" as const,
          label: optionValue(options, "headerSearchLabel", "Search"),
        },
        {
          href: optionValue(options, "headerNetworkHref", "/topics/"),
          icon: "network" as const,
          label: optionValue(options, "headerNetworkLabel", "Topic network"),
        },
      ],
      brandAriaLabel: optionValue(
        options,
        "headerBrandAriaLabel",
        `${brandLabel} home`,
      ),
      brandLabel,
      navItems,
      primaryNavLabel: optionValue(options, "headerPrimaryNavLabel", "Primary"),
      tagline,
      utilitiesNavLabel: optionValue(
        options,
        "headerUtilitiesNavLabel",
        "Utilities",
      ),
    },
  };
}

export function entrySlug(row: SnapshotRow) {
  return publicSlug(row);
}

export function entryTitle(row: SnapshotRow) {
  return String(
    row.seo_title ?? row.title ?? row.name ?? row.slug ?? "Untitled",
  );
}

export function entryDescription(row: SnapshotRow) {
  return String(row.seo_description ?? row.excerpt ?? row.summary ?? "");
}

export function entryPublishedDateTime(row: SnapshotRow) {
  const value = row.published_at ?? row.updated_at ?? row.created_at;
  if (!value) return null;

  const rawValue = String(value);
  return rawValue.includes("T") ? rawValue : `${rawValue.replace(" ", "T")}Z`;
}

export function formatDateLabel(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value.slice(0, 10);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function entryPublishedDateLabel(row: SnapshotRow) {
  return formatDateLabel(entryPublishedDateTime(row)) ?? "Undated";
}

export function entryBylineSlug(row: BylineEntry) {
  return publicSlug(row) || slugify(entryBylineName(row));
}

export function entryBylineName(row: BylineEntry) {
  return String(row.display_name ?? row.name ?? row.slug ?? "Unnamed author");
}

export function entryBylineBio(row: BylineEntry) {
  const bio = row.bio?.trim();
  return bio && bio.length > 0 ? bio : "";
}

export function entryBylineHref(row: BylineEntry) {
  return `/people/${entryBylineSlug(row)}/`;
}

export function entryAuthorName(row: PostEntry) {
  const authorName = row.author_name?.trim();
  return authorName && authorName.length > 0 ? authorName : null;
}

export function entryAuthorHref(row: PostEntry) {
  const authorName = entryAuthorName(row);
  return authorName ? `/people/${slugify(authorName)}/` : null;
}

export function entryContentType(row: PostEntry) {
  const contentType = row.content_type?.trim();
  const labels: Record<string, string> = {
    essay: "Essay",
    news: "News",
    team_note: "Team note",
    tool_announcement: "Tool announcement",
  };

  return contentType ? (labels[contentType] ?? contentType) : "Essay";
}

export function entrySummary(row: SnapshotRow) {
  return String(row.summary ?? row.excerpt ?? "");
}

export function entryExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? trimmed : null;
  } catch {
    return null;
  }
}
