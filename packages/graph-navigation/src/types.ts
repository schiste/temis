export const graphNavigationVersion = "temis.graph-navigation.v1" as const;

export type GraphNavigationVersion = typeof graphNavigationVersion;
export type GraphNavigationScope = "global" | "page";
export type GraphNavigationMode = "overview" | "content" | "focus";
export type GraphNavigationNodeType =
  | "content"
  | "initiative"
  | "publication"
  | "research_paper"
  | "topic"
  | "tag"
  | "author"
  | "tool";
export type GraphNavigationEdgeType =
  | "authored_by"
  | "tagged_with"
  | "in_topic"
  | "related"
  | "mentions_tool"
  | "documents_tool"
  | "references_publication"
  | "implements_publication"
  | "advances_initiative"
  | "supports_initiative";

export interface GraphNavigationNodeMetaInput {
  datetime?: string | null;
  href?: string | null;
  label?: string | null;
  value?: string | null;
}

export interface GraphNavigationNodeInput {
  accent?: string | null;
  description?: string | null;
  href?: string | null;
  id: string;
  label?: string | null;
  meta?: GraphNavigationNodeMetaInput[] | null;
  modes?: GraphNavigationMode[] | null;
  priority?: number | null;
  shortDescription?: string | null;
  slug?: string | null;
  title?: string | null;
  type?: GraphNavigationNodeType | null;
  visible?: boolean | number | null;
  x?: number | null;
  y?: number | null;
}

export interface GraphNavigationNodeMeta {
  datetime?: string;
  href?: string;
  label: string;
  value: string;
}

export interface GraphNavigationEdgeInput {
  id?: string | null;
  priority?: number | null;
  source: string;
  target: string;
  type?: GraphNavigationEdgeType | null;
  visible?: boolean | number | null;
}

export interface GraphNavigationNode {
  accent?: string;
  description?: string;
  href: string;
  id: string;
  label: string;
  meta: GraphNavigationNodeMeta[];
  modes: GraphNavigationMode[];
  priority: number;
  slug: string;
  type: GraphNavigationNodeType;
  x?: number;
  y?: number;
}

export interface GraphNavigationEdge {
  id: string;
  priority: number;
  source: string;
  target: string;
  type: GraphNavigationEdgeType;
}

export interface GraphNavigationSnapshot {
  currentNodeId?: string;
  edges: GraphNavigationEdge[];
  generatedAt: string;
  nodes: GraphNavigationNode[];
  scope: GraphNavigationScope;
  version: GraphNavigationVersion;
}

export interface GraphNavigationSnapshotInput {
  currentNodeId?: string;
  edges?: GraphNavigationEdgeInput[];
  generatedAt?: string;
  nodes: GraphNavigationNodeInput[];
  scope?: GraphNavigationScope;
}

export interface GraphNavigationLayoutOptions {
  centerX?: number;
  centerY?: number;
  height?: number;
  radiusX?: number;
  radiusY?: number;
  width?: number;
  forceChargeStrength?: number;
  forceCollisionRadius?: number;
  forceIterations?: number;
  forceLinkDistance?: number;
}

export interface GraphNavigationFocusOptions {
  includeIsolatedCurrent?: boolean;
}
