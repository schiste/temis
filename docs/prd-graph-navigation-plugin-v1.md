# TEMIS V1 Content Graph Navigation Plugin PRD

Status: Draft  
Date: 2026-06-13

## Summary

TEMIS V1 needs a graph-based content navigation system that makes the site feel editorial, technical, and network-aware while staying content-first.

The graph navigation plugin should render EmDash-managed relationships between content, topics, tags, authors, and tools as an accessible navigation experience. It is not a recommendation system, automated knowledge graph, or broad entity model.

Implementation design lives in [graph navigation plugin design](./graph-navigation-plugin-design.md). The initial workspace package is `@temis/graph-navigation`.

## Product Decision

V1 will include a graph-shaped content navigation data structure.

V1 should include an interactive graph navigation plugin if it can meet accessibility, performance, static-build, and mobile fallback requirements. If the interactive plugin is not ready, the same data structure must render as static graph navigation.

## Goals

- Make content relationships a first-viewport signal.
- Let readers navigate between articles, topics, tags, authors, and tools.
- Give TEMIS a cool, technical, data-like identity.
- Keep all graph data editorially managed in EmDash.
- Keep the public site fully static.
- Support responsive desktop and mobile experiences.
- Provide an accessible fallback when JavaScript is unavailable or interaction is constrained.
- Keep the graph simple enough for V1 editorial management.

## Non-Goals

- Automated relationship generation.
- Personalized navigation.
- User-specific recommendations.
- Public accounts.
- Complex entity modeling beyond articles, topics, tags, public people, and tools.
- Relationship labels.
- Relationship weights.
- Reader tracking.
- Client-side analytics.

## Users

- Public reader: explores content relationships and opens articles or public profile pages.
- Editor/admin: creates graphable content records, links related records, controls visibility and priority.
- Developer/operator: configures the graph renderer and verifies build/runtime behavior.

## Data Model

The graph data structure should be derived from EmDash-managed records for content, topics, tags, authors, and tools.

### Graph Node

Expected fields:

- ID.
- Type: `content`, `topic`, `tag`, `author`, or `tool`.
- Name/title.
- Slug.
- Short description.
- URL.
- Visibility.
- Visual priority.
- Optional accent color.
- Optional x/y placement hints.
- Optional featured article references.

Tool nodes are first-class in the graph data model, but V1 does not require a top-level tools menu item.

### Graph Edge

Expected fields:

- Source node ID.
- Target node ID.
- Optional internal type: `authored_by`, `tagged_with`, `in_topic`, `related`, `mentions_tool`, or `documents_tool`.
- Visibility.
- Optional priority.

Edges are visually unlabeled in V1.

### Graph Snapshot

The public Astro build should receive a graph navigation snapshot containing:

- Nodes.
- Edges.
- Build timestamp.
- Optional layout hints.

The snapshot must contain only published/visible graph data.

## Rendering Requirements

The graph navigation renderer should:

- Render typed graph nodes.
- Render visually unlabeled graph edges.
- Link each visible node to its appropriate public destination.
- Highlight related nodes on hover/focus where supported.
- Support keyboard navigation.
- Provide text labels for every node.
- Avoid unreadable overlap.
- Respect `prefers-reduced-motion`.
- Avoid layout shift after hydration.
- Render a meaningful fallback without JavaScript.
- Avoid client-side tracking.

## Interactive Plugin Requirements

If implemented in V1, the interactive plugin should:

- Be isolated from the core content model.
- Accept a stable graph data object as input.
- Run only on public pages that need graph navigation.
- Avoid blocking article rendering.
- Keep bundle size reasonable.
- Support a non-canvas or accessible fallback for screen readers and constrained viewports.
- Be testable from static build output.

Candidate implementation approaches:

- Lightweight custom SVG/HTML renderer for V1.
- Small graph rendering library if it provides clear value without excessive bundle or accessibility cost.
- Static renderer first, interactive enhancement second.

Recommended V1 default: start with a deterministic SVG/HTML graph renderer and add interaction progressively. Avoid a heavy canvas-only graph library until the graph size justifies it.

## Mobile Requirements

Mobile behavior remains an open design question.

Recommended V1 fallback:

- Use a simplified relationship explorer instead of shrinking the full desktop graph.
- Show prioritized nodes first.
- Expose related nodes as chips or grouped links.
- Keep destination pages reachable through normal links.

## Editorial Controls

Editors should be able to:

- Create and edit topics.
- Create and edit tags and tools.
- Connect related records.
- Hide a node from graph navigation without deleting it.
- Adjust visual priority.
- Optionally set an accent color.
- Optionally provide layout hints.

Editors should not need to understand graph algorithms to manage V1 navigation.

## Acceptance Criteria

- Topics, tags, public people, articles, and tools can be managed in EmDash.
- Relationships between graphable records can be managed in EmDash or derived deterministically from explicit fields.
- The public build emits a graph navigation data structure from visible records.
- Homepage and topic pages can render graph-based navigation from that data structure.
- Every visible graph node links to an appropriate public destination.
- Tool nodes can be represented and connected without adding a top-level tools menu item.
- The graph degrades to accessible links without JavaScript.
- Mobile has a usable graph navigation fallback.
- The renderer does not add client-side analytics, cookies, or tracking.
- The graph still looks intentional with only a small launch set of topics, tags, authors, articles, and tools.

## Open Questions

- Should V1 use a custom SVG/HTML renderer or a small graph library?
- Should layout be fully automatic, editor hinted, or deterministic from priority?
- What should the mobile graph explorer look like?
- Should nodes expose related article counts?
- Should tool pages exist in V1, or should tool nodes link to the best related article until the tool surface is designed?
