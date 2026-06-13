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
