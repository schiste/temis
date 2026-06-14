# Graph Navigation Plugin Design

Status: Draft  
Date: 2026-06-14  
Scope: V1

## Purpose

The graph navigation plugin gives TEMIS a reusable topic graph interface that
can appear on the homepage, the topic index, and eventually any page that has a
current topic context.

The plugin is navigation, not analytics and not an ontology engine.

## V1 Principles

- Topic-only graph nodes.
- Unlabeled graph edges.
- Static build output first.
- Accessible HTML links are the real navigation surface.
- SVG lines are visual structure, not the only interaction layer.
- No cookies, tracking, personalization, or client-side analytics.
- Deterministic layout so builds are stable.
- Replaceable renderer as long as the graph snapshot contract remains stable.

## Package Boundary

The plugin lives in `@temis/graph-navigation`.

It owns:

- Graph snapshot types.
- Snapshot normalization.
- Deterministic layout.
- Page-focused graph extraction.
- Static Astro renderer.

It does not own:

- EmDash schema creation.
- Editorial topic decisions.
- Search.
- Recommendation logic.
- Tracking or measurement.
- Global site chrome.

## Data Contract

### Snapshot

```ts
interface GraphNavigationSnapshot {
  version: "temis.graph-navigation.v1";
  generatedAt: string;
  scope: "global" | "page";
  currentNodeId?: string;
  nodes: GraphNavigationNode[];
  edges: GraphNavigationEdge[];
}
```

### Node

```ts
interface GraphNavigationNode {
  id: string;
  label: string;
  slug: string;
  href: string;
  description?: string;
  priority?: number;
  accent?: string;
  x?: number;
  y?: number;
}
```

`x` and `y` are optional editor/developer layout hints on a 0-100 plane.

### Edge

```ts
interface GraphNavigationEdge {
  id?: string;
  source: string;
  target: string;
  priority?: number;
}
```

Edges are undirected and unlabeled in V1.

## Rendering Model

The initial renderer uses:

- An SVG layer for edge lines.
- Absolutely positioned HTML anchors for nodes.
- A visible fallback list under the graph.
- CSS variables from the TEMIS design system.

This makes the graph:

- Linkable without JavaScript.
- Keyboard navigable.
- Screen-reader understandable.
- Safe for static builds.
- Suitable for progressive enhancement later.

## Page Graphs

The same global snapshot can produce a page graph by focusing on a current node.

V1 page graph behavior:

- Current node stays in the graph.
- Direct neighbor nodes remain visible.
- Edges are filtered to visible nodes.
- If no current node exists, render the global graph.

This supports future page-level graph modules without duplicating topic data.

## Mobile

Mobile must not shrink a dense desktop graph until it becomes unreadable.

V1 behavior:

- Keep the graph visual compact.
- Keep the fallback topic list visible and usable.
- Let the layout wrap naturally through hard-edged cells.
- Prefer clarity over force-directed graph fidelity.

## Open Questions

- Should the homepage graph use all visible topics or a curated subset?
- Should topic pages show only direct neighbors or also second-degree neighbors?
- Should editors control layout hints in EmDash V1, or should layout remain fully
  deterministic until topic count grows?
- Should article pages infer a current topic from the primary topic assignment?
