# ADR-0012: Use Graph-Based Topic Navigation For V1

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 should be a content-first editorial website, but it also needs a visible navigation idea that signals a network-aware direction from the beginning.

The durable V1 decision is the topic navigation data structure, not a specific visual renderer.

## Decision

V1 will model topic navigation as a graph-shaped data structure with topic nodes and unlabeled topic edges.

The public homepage should use this structure for graph-based topic navigation. An interactive graph plugin is preferred if it remains accessible, responsive, static-build compatible, and able to degrade to normal topic links.

## Consequences

- Editors manage topic relationships in EmDash.
- Public pages render graph navigation from published/visible topic data only.
- The graph plugin must not introduce reader tracking.
- The interactive renderer can be replaced later as long as the topic graph data contract remains stable.
- Mobile and no-JavaScript fallbacks are required, not optional.
