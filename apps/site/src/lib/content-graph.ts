import {
  createGraphNavigationSnapshot,
  type GraphNavigationEdgeInput,
  type GraphNavigationNodeInput,
  type GraphNavigationNodeMetaInput,
  type GraphNavigationSnapshot,
} from "@temis/graph-navigation";

import {
  entryAuthorHref,
  entryAuthorName,
  entryBylineBio,
  entryBylineHref,
  entryBylineName,
  entryBylineSlug,
  entryDescription,
  entryExternalUrl,
  entryPublishedDateLabel,
  entryPublishedDateTime,
  entrySlug,
  entrySummary,
  entryTitle,
  getBylines,
  getPosts,
  getSnapshotTable,
  getTools,
  type BylineEntry,
  type PostEntry,
  type SnapshotRow,
  type ToolEntry,
} from "./emdash";

interface ContentBylineEntry extends SnapshotRow {
  byline_id?: string | null;
  collection_slug?: string | null;
  content_id?: string | null;
}

interface TaxonomyDefinitionEntry extends SnapshotRow {
  label?: string | null;
  label_singular?: string | null;
  name?: string | null;
}

interface TaxonomyTermEntry extends SnapshotRow {
  accent?: string | null;
  color?: string | null;
  description?: string | null;
  label?: string | null;
  name?: string | null;
  parent_id?: string | null;
  priority?: number | null;
  taxonomy?: string | null;
  taxonomy_def_id?: string | null;
  taxonomy_id?: string | null;
}

interface ContentTaxonomyEntry extends SnapshotRow {
  collection?: string | null;
  collection_slug?: string | null;
  content_id?: string | null;
  entry_id?: string | null;
  record_id?: string | null;
  taxonomy?: string | null;
  taxonomy_def_id?: string | null;
  taxonomy_id?: string | null;
  term_id?: string | null;
}

type GraphableEntry = PostEntry | ToolEntry;

const starterTopicTerms: TaxonomyTermEntry[] = [
  {
    id: "starter-topic:essays",
    label: "Essays",
    name: "Essays",
    slug: "essays",
    description: "Long-form arguments, reflections, and field notes.",
    taxonomy: "category",
    priority: 80,
  },
  {
    id: "starter-topic:tools",
    label: "Tools",
    name: "Tools",
    slug: "tools",
    description: "Software and prototypes connected to open knowledge work.",
    taxonomy: "category",
    priority: 70,
  },
  {
    id: "starter-topic:open-knowledge",
    label: "Open knowledge",
    name: "Open knowledge",
    slug: "open-knowledge",
    description:
      "Questions about public knowledge, commons, and shared infrastructure.",
    taxonomy: "tag",
    priority: 60,
  },
];

const starterContentTaxonomies: ContentTaxonomyEntry[] = [
  {
    collection_slug: "posts",
    content_id: "seed:post:innovating-with-wikimedia-decision-making",
    taxonomy: "category",
    term_id: "starter-topic:essays",
  },
  {
    collection_slug: "posts",
    content_id: "seed:post:innovating-with-wikimedia-decision-making",
    taxonomy: "tag",
    term_id: "starter-topic:open-knowledge",
  },
];

function isDeleted(row: SnapshotRow) {
  return row.deleted_at !== null && row.deleted_at !== undefined;
}

function isHiddenFromGraph(row: SnapshotRow) {
  return row.graph_visible === false || row.graph_visible === 0;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueById<T extends { id?: string | null }>(rows: T[]) {
  const result = new Map<string, T>();

  for (const row of rows) {
    if (!row.id || result.has(row.id)) continue;
    result.set(row.id, row);
  }

  return [...result.values()];
}

function entryPriority(row: SnapshotRow, fallback: number) {
  return typeof row.graph_priority === "number" ? row.graph_priority : fallback;
}

function graphMeta(
  label: string,
  value: string | null | undefined,
  options: { datetime?: string | null; href?: string | null } = {},
): GraphNavigationNodeMetaInput | null {
  const cleanValue = cleanText(value);
  if (!cleanValue) return null;

  return {
    ...(options.datetime ? { datetime: options.datetime } : {}),
    ...(options.href ? { href: options.href } : {}),
    label,
    value: cleanValue,
  };
}

function isGraphMetaItem(
  item: GraphNavigationNodeMetaInput | null,
): item is GraphNavigationNodeMetaInput {
  return Boolean(item);
}

function postMeta(post: PostEntry) {
  const publishedDateTime = entryPublishedDateTime(post);

  return [
    graphMeta("Author", entryAuthorName(post), {
      href: entryAuthorHref(post),
    }),
    publishedDateTime
      ? graphMeta("Published", entryPublishedDateLabel(post), {
          datetime: publishedDateTime,
        })
      : null,
    graphMeta("Content type", "Essay"),
  ].filter(isGraphMetaItem);
}

function postNode(post: PostEntry): GraphNavigationNodeInput {
  return {
    description: entryDescription(post),
    href: `/blog/${entrySlug(post)}/`,
    id: `content:${post.id}`,
    label: entryTitle(post),
    meta: postMeta(post),
    priority: entryPriority(post, 50),
    slug: entrySlug(post),
    type: "content",
    visible: !isHiddenFromGraph(post),
  };
}

function toolNode(tool: ToolEntry): GraphNavigationNodeInput {
  const technicalMaturity =
    cleanText(tool.technical_maturity) || cleanText(tool.maturity);

  return {
    description: entryDescription(tool) || entrySummary(tool),
    href: `/tools/${entrySlug(tool)}/`,
    id: `tool:${tool.id}`,
    label: entryTitle(tool),
    meta: [
      graphMeta("Content type", "Tool"),
      graphMeta("License", cleanText(tool.license)),
      graphMeta("Technical maturity", technicalMaturity),
      graphMeta("Editorial confidence", cleanText(tool.editorial_confidence)),
      graphMeta("Privacy", cleanText(tool.privacy_note)),
      graphMeta("Repository", entryExternalUrl(tool.repository_url), {
        href: entryExternalUrl(tool.repository_url),
      }),
      graphMeta("Website", entryExternalUrl(tool.tool_url), {
        href: entryExternalUrl(tool.tool_url),
      }),
    ].filter(isGraphMetaItem),
    priority: entryPriority(tool, 55),
    slug: entrySlug(tool),
    type: "tool",
    visible: !isHiddenFromGraph(tool),
  };
}

function authorNode(
  byline: BylineEntry,
  publicationCount = 0,
): GraphNavigationNodeInput {
  return {
    description: entryBylineBio(byline),
    href: entryBylineHref(byline),
    id: `author:${byline.id ?? entryBylineSlug(byline)}`,
    label: entryBylineName(byline),
    meta:
      publicationCount > 0
        ? [
            graphMeta(
              "Published items",
              `${publicationCount} ${publicationCount === 1 ? "publication" : "publications"}`,
            ),
          ].filter(isGraphMetaItem)
        : [],
    priority: entryPriority(byline, 45),
    slug: entryBylineSlug(byline),
    type: "author",
  };
}

function taxonomyKind(term: TaxonomyTermEntry) {
  const taxonomy = cleanText(term.taxonomy).toLowerCase();
  const taxonomyId = cleanText(term.taxonomy_def_id).toLowerCase();
  const id = cleanText(term.id).toLowerCase();

  if (
    taxonomy === "tag" ||
    taxonomyId.includes("tag") ||
    id.includes(":tag") ||
    id.includes("_tag")
  ) {
    return "tag";
  }

  return "topic";
}

function taxonomyLabel(term: TaxonomyTermEntry) {
  return (
    cleanText(term.label) ||
    cleanText(term.name) ||
    cleanText(term.title) ||
    cleanText(term.slug) ||
    "Untitled topic"
  );
}

function taxonomySlug(term: TaxonomyTermEntry) {
  return cleanText(term.slug) || slugify(taxonomyLabel(term));
}

function taxonomyNode(term: TaxonomyTermEntry): GraphNavigationNodeInput {
  const slug = taxonomySlug(term);
  const type = taxonomyKind(term);

  return {
    accent: cleanText(term.accent) || cleanText(term.color) || null,
    description:
      cleanText(term.description) || cleanText(term.summary) || undefined,
    href: `/topics/#graph-node-${slug}`,
    id: `${type}:${term.id ?? slug}`,
    label: taxonomyLabel(term),
    priority: entryPriority(term, type === "topic" ? 70 : 35),
    slug,
    type,
    visible: !isHiddenFromGraph(term),
  };
}

function contentTaxonomyCollection(row: ContentTaxonomyEntry) {
  return cleanText(row.collection_slug) || cleanText(row.collection);
}

function contentTaxonomyContentId(row: ContentTaxonomyEntry) {
  return (
    cleanText(row.content_id) ||
    cleanText(row.entry_id) ||
    cleanText(row.record_id)
  );
}

function contentTaxonomyTermId(row: ContentTaxonomyEntry) {
  return cleanText(row.term_id) || cleanText(row.taxonomy_id);
}

function edge(
  source: string,
  target: string,
  type: GraphNavigationEdgeInput["type"],
  priority = 0,
): GraphNavigationEdgeInput {
  return {
    id: `${source}--${type}--${target}`,
    priority,
    source,
    target,
    type,
  };
}

function relatedArticleIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      return cleanText(record.id) || cleanText(record.reference_id);
    })
    .filter(Boolean);
}

async function getTaxonomyTerms() {
  const [taxonomyDefinitions, taxonomyRows, termRows] = await Promise.all([
    getSnapshotTable<TaxonomyDefinitionEntry>("_emdash_taxonomy_defs"),
    getSnapshotTable<TaxonomyTermEntry>("taxonomies"),
    getSnapshotTable<TaxonomyTermEntry>("taxonomy_terms"),
  ]);
  const definitionById = new Map(
    taxonomyDefinitions.map((definition) => [definition.id, definition]),
  );
  const terms = uniqueById([
    ...taxonomyRows,
    ...termRows,
    ...starterTopicTerms,
  ]);

  return terms
    .filter((term) => !isDeleted(term))
    .map((term) => {
      const definition = definitionById.get(cleanText(term.taxonomy_def_id));
      return {
        ...term,
        taxonomy:
          cleanText(term.taxonomy) ||
          cleanText(definition?.name) ||
          cleanText(definition?.label_singular),
      };
    });
}

async function getContentTaxonomies() {
  const rows = await Promise.all([
    getSnapshotTable<ContentTaxonomyEntry>("content_taxonomies"),
    getSnapshotTable<ContentTaxonomyEntry>("_emdash_content_taxonomies"),
    getSnapshotTable<ContentTaxonomyEntry>("taxonomy_assignments"),
  ]);

  return [...rows.flat(), ...starterContentTaxonomies].filter(
    (row) => !isDeleted(row),
  );
}

function contentNodeId(collection: string, entry: GraphableEntry) {
  return collection === "tools" ? `tool:${entry.id}` : `content:${entry.id}`;
}

function attachBylineEdges(
  posts: PostEntry[],
  bylines: BylineEntry[],
  contentBylines: ContentBylineEntry[],
) {
  const edges: GraphNavigationEdgeInput[] = [];
  const bylineById = new Map(bylines.map((byline) => [byline.id, byline]));
  const bylineBySlug = new Map(
    bylines.map((byline) => [entryBylineSlug(byline), byline]),
  );

  for (const post of posts) {
    const postId = `content:${post.id}`;
    const directByline = bylineById.get(post.primary_byline_id ?? "");
    if (directByline) {
      edges.push(edge(postId, `author:${directByline.id}`, "authored_by", 70));
      continue;
    }

    const authorName = entryAuthorName(post);
    const fallbackByline = authorName
      ? bylineBySlug.get(slugify(authorName))
      : null;
    if (fallbackByline) {
      edges.push(
        edge(postId, `author:${fallbackByline.id}`, "authored_by", 70),
      );
    }
  }

  for (const row of contentBylines) {
    if (contentTaxonomyCollection(row) !== "posts") continue;
    const contentId = contentTaxonomyContentId(row);
    const bylineId = cleanText(row.byline_id);
    if (!contentId || !bylineId || !bylineById.has(bylineId)) continue;
    edges.push(
      edge(`content:${contentId}`, `author:${bylineId}`, "authored_by", 70),
    );
  }

  return edges;
}

function attachTaxonomyEdges(
  entries: Map<string, GraphableEntry[]>,
  terms: TaxonomyTermEntry[],
  assignments: ContentTaxonomyEntry[],
) {
  const edges: GraphNavigationEdgeInput[] = [];
  const termsById = new Map(terms.map((term) => [term.id, term]));

  for (const assignment of assignments) {
    const collection = contentTaxonomyCollection(assignment);
    const contentId = contentTaxonomyContentId(assignment);
    const termId = contentTaxonomyTermId(assignment);
    const term = termsById.get(termId);
    if (!collection || !contentId || !term) continue;

    const entry = entries
      .get(collection)
      ?.find((candidate) => candidate.id === contentId);
    if (!entry) continue;

    const type = taxonomyKind(term);
    edges.push(
      edge(
        contentNodeId(collection, entry),
        `${type}:${term.id}`,
        type === "tag" ? "tagged_with" : "in_topic",
        type === "tag" ? 40 : 60,
      ),
    );
  }

  return edges;
}

function attachToolEdges(tools: ToolEntry[], posts: PostEntry[]) {
  const edges: GraphNavigationEdgeInput[] = [];
  const postIds = new Set(posts.map((post) => post.id));

  for (const tool of tools) {
    for (const postId of relatedArticleIds(tool.related_articles)) {
      if (!postIds.has(postId)) continue;
      edges.push(
        edge(`tool:${tool.id}`, `content:${postId}`, "documents_tool", 50),
      );
    }
  }

  return edges;
}

function authorPublicationCounts(posts: PostEntry[], bylines: BylineEntry[]) {
  const counts = new Map<string, number>();
  const bylineById = new Map(bylines.map((byline) => [byline.id, byline]));
  const bylineBySlug = new Map(
    bylines.map((byline) => [entryBylineSlug(byline), byline]),
  );

  for (const post of posts) {
    const directByline = bylineById.get(post.primary_byline_id ?? "");
    const fallbackByline = entryAuthorName(post)
      ? bylineBySlug.get(slugify(entryAuthorName(post) ?? ""))
      : null;
    const byline = directByline ?? fallbackByline;
    if (!byline?.id) continue;
    counts.set(byline.id, (counts.get(byline.id) ?? 0) + 1);
  }

  return counts;
}

export async function getContentGraphSnapshot(): Promise<GraphNavigationSnapshot> {
  const [posts, tools, bylines, contentBylines, terms, assignments] =
    await Promise.all([
      getPosts(),
      getTools(),
      getBylines(),
      getSnapshotTable<ContentBylineEntry>("_emdash_content_bylines"),
      getTaxonomyTerms(),
      getContentTaxonomies(),
    ]);

  const publicationCounts = authorPublicationCounts(posts, bylines);
  const nodes: GraphNavigationNodeInput[] = [
    ...posts.map(postNode),
    ...tools.map(toolNode),
    ...bylines.map((byline) =>
      authorNode(
        byline,
        byline.id ? (publicationCounts.get(byline.id) ?? 0) : 0,
      ),
    ),
    ...terms.map(taxonomyNode),
  ];
  const entries = new Map<string, GraphableEntry[]>([
    ["posts", posts],
    ["tools", tools],
  ]);
  const edges: GraphNavigationEdgeInput[] = [
    ...attachBylineEdges(posts, bylines, contentBylines),
    ...attachTaxonomyEdges(entries, terms, assignments),
    ...attachToolEdges(tools, posts),
  ];

  return createGraphNavigationSnapshot({
    edges,
    nodes,
    scope: "global",
  });
}
