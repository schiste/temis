import type {
  GraphNavigationFocusOptions,
  GraphNavigationSnapshot,
} from "./types";

export function focusGraphNavigationSnapshot(
  snapshot: GraphNavigationSnapshot,
  currentNodeId: string | undefined,
  options: GraphNavigationFocusOptions = {},
): GraphNavigationSnapshot {
  if (!currentNodeId) return snapshot;

  const neighborIds = new Set<string>([currentNodeId]);
  const adjacentEdges = snapshot.edges.filter((edge) => {
    if (edge.source === currentNodeId) {
      neighborIds.add(edge.target);
      return true;
    }
    if (edge.target === currentNodeId) {
      neighborIds.add(edge.source);
      return true;
    }
    return false;
  });

  const nodes = snapshot.nodes.filter((node) => neighborIds.has(node.id));
  if (nodes.length === 0 && !options.includeIsolatedCurrent) return snapshot;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = adjacentEdges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );

  return {
    ...snapshot,
    currentNodeId,
    edges,
    nodes,
    scope: "page",
  };
}
