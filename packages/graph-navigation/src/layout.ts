import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type {
  GraphNavigationLayoutOptions,
  GraphNavigationNode,
  GraphNavigationSnapshot,
} from "./types";

const defaultLayout = {
  centerX: 50,
  centerY: 50,
  forceChargeStrength: -34,
  forceCollisionRadius: 8.5,
  forceIterations: 260,
  forceLinkDistance: 24,
  height: 100,
  radiusX: 34,
  radiusY: 30,
  width: 100,
} satisfies Required<GraphNavigationLayoutOptions>;

function resolveLayout(options: GraphNavigationLayoutOptions = {}) {
  return { ...defaultLayout, ...options };
}

type ForceLayoutNode = SimulationNodeDatum & {
  id: string;
  sourceNode: GraphNavigationNode;
};

type ForceLayoutLink = SimulationLinkDatum<ForceLayoutNode> & {
  id: string;
};

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seededUnit(id: string, salt: string) {
  return hashText(`${id}:${salt}`) / 0xffffffff;
}

function seededInitialPosition(
  node: GraphNavigationNode,
  layout: Required<GraphNavigationLayoutOptions>,
) {
  const angle = seededUnit(node.id, "force-angle") * Math.PI * 2;
  const radius =
    0.38 + seededUnit(node.id, "force-radius") * 0.62 * (1 + node.priority / 8);

  return {
    x: layout.centerX + Math.cos(angle) * layout.radiusX * radius,
    y: layout.centerY + Math.sin(angle) * layout.radiusY * radius,
  };
}

function createForceLayoutNode(
  node: GraphNavigationNode,
  layout: Required<GraphNavigationLayoutOptions>,
): ForceLayoutNode {
  const hasPinnedPosition = node.x !== undefined && node.y !== undefined;
  const initialPosition = hasPinnedPosition
    ? { x: node.x, y: node.y }
    : seededInitialPosition(node, layout);

  return {
    id: node.id,
    sourceNode: node,
    x: initialPosition.x,
    y: initialPosition.y,
    fx: hasPinnedPosition ? node.x : null,
    fy: hasPinnedPosition ? node.y : null,
  };
}

function scalePosition(
  value: number,
  inputCenter: number,
  outputCenter: number,
  scale: number,
) {
  return outputCenter + (value - inputCenter) * scale;
}

export function withGraphNavigationLayout(
  snapshot: GraphNavigationSnapshot,
  options: GraphNavigationLayoutOptions = {},
): GraphNavigationSnapshot {
  const layout = resolveLayout(options);
  if (snapshot.nodes.length === 0) return snapshot;
  if (snapshot.nodes.length === 1) {
    const [node] = snapshot.nodes;

    return {
      ...snapshot,
      nodes: [
        {
          ...node,
          x: node.x ?? layout.centerX,
          y: node.y ?? layout.centerY,
        },
      ],
    };
  }

  const simulationNodes = snapshot.nodes
    .map((node) => createForceLayoutNode(node, layout))
    .sort((a, b) => a.id.localeCompare(b.id));
  const nodeIds = new Set(simulationNodes.map((node) => node.id));
  const simulationLinks: ForceLayoutLink[] = snapshot.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  forceSimulation<ForceLayoutNode, ForceLayoutLink>(simulationNodes)
    .stop()
    .force(
      "link",
      forceLink<ForceLayoutNode, ForceLayoutLink>(simulationLinks)
        .id((node) => node.id)
        .distance(layout.forceLinkDistance)
        .strength(0.72),
    )
    .force(
      "charge",
      forceManyBody<ForceLayoutNode>().strength(layout.forceChargeStrength),
    )
    .force(
      "collide",
      forceCollide<ForceLayoutNode>(layout.forceCollisionRadius).iterations(2),
    )
    .force(
      "center",
      forceCenter<ForceLayoutNode>(layout.centerX, layout.centerY),
    )
    .force("x", forceX<ForceLayoutNode>(layout.centerX).strength(0.045))
    .force("y", forceY<ForceLayoutNode>(layout.centerY).strength(0.045))
    .tick(layout.forceIterations);

  const xValues = simulationNodes.map((node) => node.x ?? layout.centerX);
  const yValues = simulationNodes.map((node) => node.y ?? layout.centerY);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const insetX = Math.max(10, layout.width * 0.12);
  const insetY = Math.max(10, layout.height * 0.12);
  const availableWidth = layout.width - insetX * 2;
  const availableHeight = layout.height - insetY * 2;
  const forceWidth = Math.max(1, xMax - xMin);
  const forceHeight = Math.max(1, yMax - yMin);
  const fitScale = Math.min(
    1,
    availableWidth / forceWidth,
    availableHeight / forceHeight,
  );
  const forceCenterX = (xMin + xMax) / 2;
  const forceCenterY = (yMin + yMax) / 2;
  const positionsById = new Map(
    simulationNodes.map((node) => {
      if (node.sourceNode.x !== undefined && node.sourceNode.y !== undefined) {
        return [
          node.id,
          {
            x: round(clamp(node.sourceNode.x, 0, layout.width)),
            y: round(clamp(node.sourceNode.y, 0, layout.height)),
          },
        ];
      }

      return [
        node.id,
        {
          x: round(
            clamp(
              scalePosition(
                node.x ?? layout.centerX,
                forceCenterX,
                layout.centerX,
                fitScale,
              ),
              insetX,
              layout.width - insetX,
            ),
          ),
          y: round(
            clamp(
              scalePosition(
                node.y ?? layout.centerY,
                forceCenterY,
                layout.centerY,
                fitScale,
              ),
              insetY,
              layout.height - insetY,
            ),
          ),
        },
      ];
    }),
  );

  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      ...positionsById.get(node.id),
    })),
  };
}
