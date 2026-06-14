import { readFile } from "node:fs/promises";
import path from "node:path";

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

export interface PageEntry extends SnapshotRow {
  content?: unknown;
  seo_description?: string;
  seo_title?: string;
  summary?: string;
  title: string;
}

export interface PostEntry extends SnapshotRow {
  content?: unknown;
  excerpt?: string;
  seo_description?: string;
  seo_title?: string;
  title: string;
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

const defaultSnapshotPath = path.resolve(
  process.cwd(),
  ".generated/emdash-snapshot.json",
);

let cachedSnapshot: SnapshotData | null = null;

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

  cachedSnapshot = parsed;
  return parsed;
}

function collectionTable(collection: string) {
  return `ec_${collection}`;
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

export async function getPages() {
  const pages = await getCollection<PageEntry>("pages");
  return pages
    .filter((page) => {
      const slug = publicSlug(page);
      return slug.length > 0 && slug !== "home" && slug !== "index";
    })
    .sort((a, b) => publicSlug(a).localeCompare(publicSlug(b)));
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

function referencedHref(
  collection: string | null | undefined,
  row: SnapshotRow,
) {
  const slug = publicSlug(row);
  if (!slug || slug === "home" || slug === "index") return "/";
  if (collection === "posts") return `/blog/${slug}/`;
  return `/${slug}/`;
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
  const [homePage, aboutPage, navItems] = await Promise.all([
    getHomePage(),
    getPageBySlug("about"),
    getPrimaryNavItems(),
  ]);

  const brandLabel = homePage ? entryTitle(homePage) : "TEMIS";
  const homeSummary = homePage ? entrySummary(homePage) : "";
  const aboutSummary = aboutPage ? entrySummary(aboutPage) : "";

  return {
    footer: {
      commonsHeading: aboutPage
        ? entryTitle(aboutPage)
        : "Built for the commons",
      commonsText:
        aboutSummary ||
        "TEMIS is a public resource. Contribute, share, improve.",
      siteHeading: brandLabel,
      siteText:
        homeSummary ||
        "A working group exploring the future of open knowledge.",
    },
    header: {
      brandLabel,
      navItems,
      tagline: homeSummary || "Exploring open knowledge in a post-AI world",
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

export function entrySummary(row: SnapshotRow) {
  return String(row.summary ?? row.excerpt ?? "");
}
