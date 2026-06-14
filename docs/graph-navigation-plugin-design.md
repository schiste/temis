# Graph Navigation Plugin Design

Status: Draft  
Date: 2026-06-14  
Scope: V1

## Purpose

The graph navigation plugin gives TEMIS a reusable content graph interface that
can appear on the homepage, the topic index, and eventually any page that has a
current content, topic, tag, author, or tool context.

The plugin is navigation, not analytics and not an ontology engine.

## V1 Principles

- Typed graph nodes for content, topics, tags, authors, and tools.
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
- Editorial relationship decisions.
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
  type: "content" | "topic" | "tag" | "author" | "tool";
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
  type?:
    | "authored_by"
    | "tagged_with"
    | "in_topic"
    | "related"
    | "mentions_tool"
    | "documents_tool";
  source: string;
  target: string;
  priority?: number;
}
```

Edges are undirected in the V1 renderer. They may carry internal types for data
quality, but those types are not rendered as visible edge labels.

## Rendering Model

The initial renderer uses:

- An SVG layer for edge lines.
- Absolutely positioned HTML anchors for nodes.
- A visible fallback list under the graph.
- CSS variables from the TEMIS design system.
- Node-type styling hooks for content, topics, tags, authors, and tools.

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

This supports page-level graph modules without duplicating content relationship
data. For example, an article graph can show its authors, topics, tags, and
mentioned tools; a tool graph can show related articles, people, topics, and
tags even if tools are not linked from the main menu.

## Mobile

Mobile must not shrink a dense desktop graph until it becomes unreadable.

V1 behavior:

- Keep the graph visual compact.
- Keep the fallback graph link list visible and usable.
- Let the layout wrap naturally through hard-edged cells.
- Prefer clarity over force-directed graph fidelity.

## Open Questions

- Should the homepage graph use all visible nodes or a curated subset?
- Should pages show only direct neighbors or also second-degree neighbors?
- Should editors control layout hints in EmDash V1, or should layout remain fully
  deterministic until the graph grows?
- Should article pages infer a current topic from the primary topic assignment?
- Should tool pages exist in V1, or should tool nodes link to their best related
  article until the tool surface is designed?
