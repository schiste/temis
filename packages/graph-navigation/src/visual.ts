import { clamp, round, seededSignedUnit, seededUnit } from "./geometry";
import type {
  GraphNavigationEdge,
  GraphNavigationMode,
  GraphNavigationNode,
} from "./types";

// The visual-projection layer: turns laid-out nodes (from layout.ts) into the
// jittered "constellation" coordinates and idle-animation offsets the renderer
// draws, and computes the curved edge paths between them. Kept out of the
// component so this geometry is testable and the .astro stays presentational.

export type VisualGraphNode = GraphNavigationNode & {
  idleDelay: number;
  idleDuration: number;
  idleX: number;
  idleY: number;
  visualX: number;
  visualY: number;
};

export type VisualGraphEdge = GraphNavigationEdge & {
  modes: GraphNavigationMode[];
  path: string;
  sourceNode: VisualGraphNode;
  targetNode: VisualGraphNode;
};

export function toVisualNode(node: GraphNavigationNode): VisualGraphNode {
  const baseX = node.x ?? 50;
  const baseY = node.y ?? 50;
  const visualX = round(
    clamp(baseX + seededSignedUnit(node.id, "constellation-x") * 2.35, 8, 92),
  );
  const visualY = round(
    clamp(baseY + seededSignedUnit(node.id, "constellation-y") * 2.1, 8, 92),
  );

  return {
    ...node,
    idleDelay: -Math.round(seededUnit(node.id, "idle-delay") * 9000),
    idleDuration:
      8800 + Math.round(seededUnit(node.id, "idle-duration") * 4200),
    idleX: round(seededSignedUnit(node.id, "idle-x") * 0.12),
    idleY: round(seededSignedUnit(node.id, "idle-y") * 0.12),
    visualX,
    visualY,
  };
}

export function edgePath(
  edgeId: string,
  sourceNode: VisualGraphNode,
  targetNode: VisualGraphNode,
) {
  const x1 = sourceNode.visualX;
  const y1 = sourceNode.visualY;
  const x2 = targetNode.visualX;
  const y2 = targetNode.visualY;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const direction = seededSignedUnit(edgeId, "curve-side") >= 0 ? 1 : -1;
  const bend =
    Math.min(5.2, Math.max(1.8, distance * 0.08)) *
    direction *
    (0.78 + seededUnit(edgeId, "curve-weight") * 0.44);
  const controlX = round((x1 + x2) / 2 + normalX * bend);
  const controlY = round((y1 + y2) / 2 + normalY * bend);

  return `M ${round(x1)} ${round(y1)} Q ${controlX} ${controlY} ${round(
    x2,
  )} ${round(y2)}`;
}
