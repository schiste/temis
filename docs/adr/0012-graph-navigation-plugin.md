# ADR-0012: Use Graph-Based Content Navigation For V1

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 should be a content-first editorial website, but it also needs a visible navigation idea that signals a network-aware direction from the beginning.

The durable V1 decision is the graph navigation data structure, not a specific visual renderer.

## Decision

V1 will model navigation as a graph-shaped data structure with typed nodes for content, topics, tags, authors, and tools.

The public homepage should use this structure for graph-based content navigation. An interactive graph plugin is preferred if it remains accessible, responsive, static-build compatible, and able to degrade to normal links.

Edges may carry internal relationship types for build and editorial logic, but public V1 rendering should keep the edges visually unlabeled.

## Consequences

- Editors manage graph-relevant content relationships in EmDash.
- Public pages render graph navigation from published/visible content, topic, tag, author, and tool data only.
- The graph plugin must not introduce reader tracking.
- Tools can be first-class graph nodes without being surfaced in the main website menu.
- The interactive renderer can be replaced later as long as the graph data contract remains stable.
- Mobile and no-JavaScript fallbacks are required, not optional.
