import {
  graphNavigationVersion,
  type GraphNavigationEdge,
  type GraphNavigationEdgeInput,
  type GraphNavigationEdgeType,
  type GraphNavigationNode,
  type GraphNavigationNodeInput,
  type GraphNavigationNodeType,
  type GraphNavigationSnapshot,
  type GraphNavigationSnapshotInput,
} from "./types";

const nodeTypes = new Set<GraphNavigationNodeType>([
  "content",
  "topic",
  "tag",
  "author",
  "tool",
]);

const edgeTypes = new Set<GraphNavigationEdgeType>([
  "authored_by",
  "tagged_with",
  "in_topic",
  "related",
  "mentions_tool",
  "documents_tool",
]);

function isVisible(value: GraphNavigationNodeInput | GraphNavigationEdgeInput) {
  return (
    value.visible === undefined ||
    value.visible === null ||
    value.visible === true ||
    value.visible === 1
  );
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHref(href: string | null | undefined, slug: string) {
  const cleanHref = cleanText(href);
  if (cleanHref) {
    if (cleanHref === "/") return cleanHref;
    const prefixed = cleanHref.startsWith("/") ? cleanHref : `/${cleanHref}`;
    return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
  }

  return `/topics/${slug}/`;
}

function normalizeCoordinate(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, value));
}

function normalizeNodeType(
  value: GraphNavigationNodeType | null | undefined,
): GraphNavigationNodeType {
  return value && nodeTypes.has(value) ? value : "topic";
}

function normalizeEdgeType(
  value: GraphNavigationEdgeType | null | undefined,
): GraphNavigationEdgeType {
  return value && edgeTypes.has(value) ? value : "related";
}

function normalizeNode(
  node: GraphNavigationNodeInput,
): GraphNavigationNode | null {
  if (!isVisible(node)) return null;

  const label = cleanText(node.label) ?? cleanText(node.title);
  if (!label) return null;

  const slug = cleanText(node.slug) ?? slugify(label);
  const description =
    cleanText(node.description) ??
    cleanText(node.shortDescription) ??
    undefined;

  return {
    ...(cleanText(node.accent)
      ? { accent: cleanText(node.accent) ?? undefined }
      : {}),
    ...(description ? { description } : {}),
    ...(normalizeCoordinate(node.x) !== undefined
      ? { x: normalizeCoordinate(node.x) }
      : {}),
    ...(normalizeCoordinate(node.y) !== undefined
      ? { y: normalizeCoordinate(node.y) }
      : {}),
    href: normalizeHref(node.href, slug),
    id: node.id,
    label,
    priority: typeof node.priority === "number" ? node.priority : 0,
    slug,
    type: normalizeNodeType(node.type),
  };
}

function normalizeEdge(
  edge: GraphNavigationEdgeInput,
): GraphNavigationEdge | null {
  if (!isVisible(edge)) return null;
  if (!edge.source || !edge.target || edge.source === edge.target) return null;

  const [first, second] = [edge.source, edge.target].sort();
  const id = cleanText(edge.id) ?? `${first}--${second}`;

  return {
    id,
    priority: typeof edge.priority === "number" ? edge.priority : 0,
    source: edge.source,
    target: edge.target,
    type: normalizeEdgeType(edge.type),
  };
}

function byPriorityThenLabel(a: GraphNavigationNode, b: GraphNavigationNode) {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.label.localeCompare(b.label);
}

function byPriorityThenId(a: GraphNavigationEdge, b: GraphNavigationEdge) {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.id.localeCompare(b.id);
}

export function createGraphNavigationSnapshot(
  input: GraphNavigationSnapshotInput,
): GraphNavigationSnapshot {
  const nodes = input.nodes
    .map(normalizeNode)
    .filter((node): node is GraphNavigationNode => Boolean(node))
    .sort(byPriorityThenLabel);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (input.edges ?? [])
    .map(normalizeEdge)
    .filter((edge): edge is GraphNavigationEdge => {
      return Boolean(
        edge && nodeIds.has(edge.source) && nodeIds.has(edge.target),
      );
    })
    .sort(byPriorityThenId);

  return {
    ...(input.currentNodeId ? { currentNodeId: input.currentNodeId } : {}),
    edges,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    nodes,
    scope: input.scope ?? "global",
    version: graphNavigationVersion,
  };
}
