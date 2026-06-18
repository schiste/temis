import {
  createGraphNavigationSnapshot,
  focusGraphNavigationSnapshot,
  type GraphNavigationEdgeInput,
  type GraphNavigationNodeInput,
  type GraphNavigationNodeMetaInput,
  type GraphNavigationSnapshot,
} from "@temis/graph-navigation";

import {
  blogHref,
  entryAuthorHref,
  entryAuthorName,
  entryBylineBio,
  entryBylineHref,
  entryBylineName,
  entryBylineSlug,
  entryContentType,
  entryDescription,
  entryExternalUrl,
  entryPublicationDateLabel,
  entryPublicationDateTime,
  entryPublicationTypeLabel,
  entryPublishedDateLabel,
  entryPublishedDateTime,
  entrySlug,
  entrySummary,
  entryTitle,
  formatDateLabel,
  getBylines,
  getPosts,
  getPublications,
  getSnapshotTable,
  getTools,
  publicationHref,
  slugify,
  toolHref,
  type BylineEntry,
  type PostEntry,
  type PublicationEntry,
  type SnapshotRow,
  type ToolEntry,
} from "./emdash";
import { relatedPeopleReferences, resolveRelatedRecords } from "./relations";

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
  data?: unknown;
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

type GraphableEntry = PostEntry | PublicationEntry | ToolEntry;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    graphMeta("Content type", entryContentType(post)),
  ].filter(isGraphMetaItem);
}

function postNode(post: PostEntry): GraphNavigationNodeInput {
  return {
    description: entryDescription(post),
    href: blogHref(post),
    id: `content:${post.id}`,
    label: entryTitle(post),
    meta: postMeta(post),
    priority: entryPriority(post, 50),
    slug: entrySlug(post),
    type: "content",
    visible: !isHiddenFromGraph(post),
  };
}

export function postGraphNodeId(post: PostEntry) {
  return `content:${post.id}`;
}

function publicationNodeType(publication: PublicationEntry) {
  return cleanText(publication.publication_type) === "research_paper"
    ? "research_paper"
    : "publication";
}

function publicationMeta(publication: PublicationEntry) {
  const publicationDateTime = entryPublicationDateTime(publication);

  return [
    graphMeta("Content type", entryPublicationTypeLabel(publication)),
    graphMeta("Authors", cleanText(publication.publication_authors)),
    graphMeta("Venue", cleanText(publication.venue)),
    publicationDateTime
      ? graphMeta("Published", entryPublicationDateLabel(publication), {
          datetime: publicationDateTime,
        })
      : null,
    graphMeta("DOI", cleanText(publication.doi), {
      href: publication.doi
        ? `https://doi.org/${cleanText(publication.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`
        : null,
    }),
    graphMeta("arXiv", cleanText(publication.arxiv_id), {
      href: publication.arxiv_id
        ? `https://arxiv.org/abs/${cleanText(publication.arxiv_id)}`
        : null,
    }),
    graphMeta("Source", entryExternalUrl(publication.source_url), {
      href: entryExternalUrl(publication.source_url),
    }),
    graphMeta("PDF", entryExternalUrl(publication.pdf_url), {
      href: entryExternalUrl(publication.pdf_url),
    }),
    graphMeta("License", cleanText(publication.license)),
  ].filter(isGraphMetaItem);
}

function publicationNode(
  publication: PublicationEntry,
): GraphNavigationNodeInput {
  return {
    description: entryDescription(publication) || entrySummary(publication),
    href: publicationHref(publication),
    id: `publication:${publication.id}`,
    label: entryTitle(publication),
    meta: publicationMeta(publication),
    priority: entryPriority(publication, 52),
    slug: entrySlug(publication),
    type: publicationNodeType(publication),
    visible: !isHiddenFromGraph(publication),
  };
}

export function publicationGraphNodeId(publication: PublicationEntry) {
  return `publication:${publication.id}`;
}

function toolNode(tool: ToolEntry): GraphNavigationNodeInput {
  const technicalMaturity =
    cleanText(tool.technical_maturity) || cleanText(tool.maturity);
  const github = tool.github;

  return {
    description: entryDescription(tool) || entrySummary(tool),
    href: toolHref(tool),
    id: `tool:${tool.id}`,
    label: entryTitle(tool),
    meta: [
      graphMeta("Content type", "Tool"),
      graphMeta("License", cleanText(tool.license)),
      graphMeta("Technical maturity", technicalMaturity),
      graphMeta("Editorial confidence", cleanText(tool.editorial_confidence)),
      graphMeta("Privacy", cleanText(tool.privacy_note)),
      graphMeta("Language", github?.primaryLanguage),
      graphMeta("Last commit", formatDateLabel(github?.lastCommitAt), {
        datetime: github?.lastCommitAt,
      }),
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

export function toolGraphNodeId(tool: ToolEntry) {
  return `tool:${tool.id}`;
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
  const nativeName = cleanText(term.name).toLowerCase();
  const taxonomyId = cleanText(term.taxonomy_def_id).toLowerCase();
  const id = cleanText(term.id).toLowerCase();

  if (
    taxonomy === "tag" ||
    nativeName === "tag" ||
    taxonomyId.includes("tag") ||
    id.includes(":tag") ||
    id.includes("_tag")
  ) {
    return "tag";
  }

  return "topic";
}

function taxonomyData(term: TaxonomyTermEntry) {
  return isRecord(term.data) ? term.data : {};
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

function bylineSlugFromId(value: string | null | undefined) {
  const cleanValue = cleanText(value);
  if (!cleanValue) return "";

  return cleanValue.split(":").filter(Boolean).at(-1) ?? "";
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

function relatedPeopleNames(value: unknown) {
  return relatedPeopleReferences(value).map((person) => person.label);
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
  const terms = uniqueById([...taxonomyRows, ...termRows]);

  return terms
    .filter((term) => !isDeleted(term))
    .map((term) => {
      const definition = definitionById.get(cleanText(term.taxonomy_def_id));
      const data = taxonomyData(term);
      const nativeDefinition = taxonomyDefinitions.find(
        (item) => cleanText(item.name) === cleanText(term.name),
      );

      return {
        ...data,
        ...term,
        taxonomy:
          cleanText(term.taxonomy) ||
          cleanText(nativeDefinition?.name) ||
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

  return rows.flat().filter((row) => !isDeleted(row));
}

function contentNodeId(collection: string, entry: GraphableEntry) {
  if (collection === "tools") return `tool:${entry.id}`;
  if (collection === "publications") return `publication:${entry.id}`;
  return `content:${entry.id}`;
}

function createBylineResolver(bylines: BylineEntry[]) {
  const bylineById = new Map(bylines.map((byline) => [byline.id, byline]));
  const bylineBySlug = new Map(
    bylines.map((byline) => [entryBylineSlug(byline), byline]),
  );

  const resolve = (value: string | null | undefined) => {
    const id = cleanText(value);
    return bylineById.get(id) ?? bylineBySlug.get(bylineSlugFromId(id));
  };
  const byName = (name: string) => bylineBySlug.get(slugify(name));

  return {
    has: (id: string | undefined) => Boolean(id) && bylineById.has(id),
    resolve,
    resolveId: (value: string | null | undefined) => resolve(value)?.id,
    byName,
    relatedBylines: (tool: ToolEntry) =>
      relatedPeopleNames(tool.related_people)
        .map((name) => byName(name))
        .filter((byline): byline is BylineEntry => Boolean(byline)),
  };
}

function attachBylineEdges(
  posts: PostEntry[],
  publications: PublicationEntry[],
  tools: ToolEntry[],
  bylines: BylineEntry[],
  contentBylines: ContentBylineEntry[],
) {
  const edges: GraphNavigationEdgeInput[] = [];
  const resolver = createBylineResolver(bylines);

  for (const post of posts) {
    const postId = `content:${post.id}`;
    const authorName = entryAuthorName(post);
    const byline =
      resolver.resolve(post.primary_byline_id) ??
      (authorName ? resolver.byName(authorName) : undefined);
    if (byline?.id) {
      edges.push(edge(postId, `author:${byline.id}`, "authored_by", 70));
    }
  }

  for (const tool of tools) {
    const toolId = `tool:${tool.id}`;
    const bylinesForTool = new Map(
      [
        resolver.resolve(tool.primary_byline_id),
        ...resolver.relatedBylines(tool),
      ]
        .filter((byline): byline is BylineEntry => Boolean(byline?.id))
        .map((byline) => [byline.id, byline]),
    );

    for (const byline of bylinesForTool.values()) {
      edges.push(edge(toolId, `author:${byline.id}`, "authored_by", 70));
    }
  }

  for (const publication of publications) {
    const publicationId = `publication:${publication.id}`;
    const byline = resolver.resolve(publication.primary_byline_id);
    if (byline?.id) {
      edges.push(edge(publicationId, `author:${byline.id}`, "authored_by", 70));
    }
  }

  for (const row of contentBylines) {
    const collection = contentTaxonomyCollection(row);
    if (
      collection !== "posts" &&
      collection !== "publications" &&
      collection !== "tools"
    ) {
      continue;
    }
    const contentId = contentTaxonomyContentId(row);
    const byline = resolver.resolve(row.byline_id);
    if (!contentId || !byline?.id) continue;
    const nodeId =
      collection === "tools"
        ? `tool:${contentId}`
        : collection === "publications"
          ? `publication:${contentId}`
          : `content:${contentId}`;
    edges.push(edge(nodeId, `author:${byline.id}`, "authored_by", 70));
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

  for (const tool of tools) {
    for (const post of resolveRelatedRecords(
      tool.related_articles,
      posts,
      "posts",
    )) {
      edges.push(
        edge(`tool:${tool.id}`, `content:${post.id}`, "documents_tool", 50),
      );
    }
  }

  return edges;
}

function attachPublicationEdges(
  posts: PostEntry[],
  publications: PublicationEntry[],
  tools: ToolEntry[],
) {
  const edges: GraphNavigationEdgeInput[] = [];

  for (const post of posts) {
    for (const publication of resolveRelatedRecords(
      post.related_publications,
      publications,
      "publications",
    )) {
      edges.push(
        edge(
          `content:${post.id}`,
          `publication:${publication.id}`,
          "references_publication",
          50,
        ),
      );
    }
  }

  for (const tool of tools) {
    for (const publication of resolveRelatedRecords(
      tool.related_publications,
      publications,
      "publications",
    )) {
      edges.push(
        edge(
          `tool:${tool.id}`,
          `publication:${publication.id}`,
          "implements_publication",
          50,
        ),
      );
    }
  }

  for (const publication of publications) {
    for (const post of resolveRelatedRecords(
      publication.related_articles,
      posts,
      "posts",
    )) {
      edges.push(
        edge(
          `publication:${publication.id}`,
          `content:${post.id}`,
          "references_publication",
          50,
        ),
      );
    }

    for (const tool of resolveRelatedRecords(
      publication.related_tools,
      tools,
      "tools",
    )) {
      edges.push(
        edge(
          `publication:${publication.id}`,
          `tool:${tool.id}`,
          "implements_publication",
          50,
        ),
      );
    }
  }

  return edges;
}

function authorPublicationCounts(
  posts: PostEntry[],
  publications: PublicationEntry[],
  tools: ToolEntry[],
  bylines: BylineEntry[],
  contentBylines: ContentBylineEntry[],
) {
  const counts = new Map<string, Set<string>>();
  const resolver = createBylineResolver(bylines);

  const addCount = (bylineId: string | null | undefined, itemId: string) => {
    if (!bylineId || !resolver.has(bylineId)) return;
    if (!counts.has(bylineId)) counts.set(bylineId, new Set());
    counts.get(bylineId)!.add(itemId);
  };

  for (const post of posts) {
    const authorName = entryAuthorName(post);
    const directBylineId = resolver.resolveId(post.primary_byline_id);
    const fallbackId = authorName ? resolver.byName(authorName)?.id : undefined;
    addCount(directBylineId ?? fallbackId, `content:${post.id}`);
  }

  for (const tool of tools) {
    addCount(resolver.resolveId(tool.primary_byline_id), `tool:${tool.id}`);
    for (const byline of resolver.relatedBylines(tool)) {
      addCount(byline.id, `tool:${tool.id}`);
    }
  }

  for (const publication of publications) {
    addCount(
      resolver.resolveId(publication.primary_byline_id),
      `publication:${publication.id}`,
    );
  }

  for (const row of contentBylines) {
    const collection = contentTaxonomyCollection(row);
    if (
      collection !== "posts" &&
      collection !== "publications" &&
      collection !== "tools"
    ) {
      continue;
    }
    const contentId = contentTaxonomyContentId(row);
    const bylineId = resolver.resolveId(row.byline_id);
    if (!contentId || !bylineId) continue;
    addCount(
      bylineId,
      collection === "tools"
        ? `tool:${contentId}`
        : collection === "publications"
          ? `publication:${contentId}`
          : `content:${contentId}`,
    );
  }

  return new Map(
    [...counts].map(([bylineId, items]) => [bylineId, items.size]),
  );
}

export async function getContentGraphSnapshot(): Promise<GraphNavigationSnapshot> {
  const [
    posts,
    publications,
    tools,
    bylines,
    contentBylines,
    terms,
    assignments,
  ] = await Promise.all([
    getPosts(),
    getPublications(),
    getTools(),
    getBylines(),
    getSnapshotTable<ContentBylineEntry>("_emdash_content_bylines"),
    getTaxonomyTerms(),
    getContentTaxonomies(),
  ]);

  const publicationCounts = authorPublicationCounts(
    posts,
    publications,
    tools,
    bylines,
    contentBylines,
  );
  const nodes: GraphNavigationNodeInput[] = [
    ...posts.map(postNode),
    ...publications.map(publicationNode),
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
    ["publications", publications],
    ["tools", tools],
  ]);
  const edges: GraphNavigationEdgeInput[] = [
    ...attachBylineEdges(posts, publications, tools, bylines, contentBylines),
    ...attachTaxonomyEdges(entries, terms, assignments),
    ...attachToolEdges(tools, posts),
    ...attachPublicationEdges(posts, publications, tools),
  ];

  return createGraphNavigationSnapshot({
    edges,
    nodes,
    scope: "global",
  });
}

export async function getFocusedContentGraphSnapshot(currentNodeId: string) {
  return focusGraphNavigationSnapshot(
    await getContentGraphSnapshot(),
    currentNodeId,
    { includeIsolatedCurrent: true },
  );
}
