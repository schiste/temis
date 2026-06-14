import type {
  GraphNavigationLayoutOptions,
  GraphNavigationSnapshot,
} from "./types";

const defaultLayout = {
  centerX: 50,
  centerY: 50,
  height: 100,
  radiusX: 34,
  radiusY: 30,
  width: 100,
} satisfies Required<GraphNavigationLayoutOptions>;

function resolveLayout(options: GraphNavigationLayoutOptions = {}) {
  return { ...defaultLayout, ...options };
}

export function withGraphNavigationLayout(
  snapshot: GraphNavigationSnapshot,
  options: GraphNavigationLayoutOptions = {},
): GraphNavigationSnapshot {
  const layout = resolveLayout(options);
  const unplacedNodes = snapshot.nodes.filter(
    (node) => node.x === undefined || node.y === undefined,
  );
  const count = Math.max(1, unplacedNodes.length);

  const placedNodes = snapshot.nodes.map((node) => {
    if (node.x !== undefined && node.y !== undefined) return node;

    const index = unplacedNodes.findIndex((item) => item.id === node.id);
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;

    return {
      ...node,
      x:
        Math.round((layout.centerX + layout.radiusX * Math.cos(angle)) * 100) /
        100,
      y:
        Math.round((layout.centerY + layout.radiusY * Math.sin(angle)) * 100) /
        100,
    };
  });

  return {
    ...snapshot,
    nodes: placedNodes,
  };
}
