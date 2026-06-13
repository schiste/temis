# TEMIS V1 Graph Navigation Plugin PRD

Status: Draft  
Date: 2026-06-13

## Summary

TEMIS V1 needs a graph-based topic navigation system that makes the site feel editorial, technical, and network-aware while staying content-first.

The graph navigation plugin should render EmDash-managed topic relationships as an accessible homepage navigation experience. It is not a knowledge graph, recommendation system, or broad entity model.

## Product Decision

V1 will include a graph-shaped topic navigation data structure.

V1 should include an interactive graph navigation plugin if it can meet accessibility, performance, static-build, and mobile fallback requirements. If the interactive plugin is not ready, the same data structure must render as static topic navigation.

## Goals

- Make topics and relationships a first-viewport signal.
- Let readers navigate from topics to topic pages and related articles.
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
- Complex entity modeling beyond topics, articles, and public people.
- Relationship labels.
- Relationship weights.
- Reader tracking.
- Client-side analytics.

## Users

- Public reader: explores topics and opens articles.
- Editor/admin: creates topics, links related topics, controls visibility and priority.
- Developer/operator: configures the graph renderer and verifies build/runtime behavior.

## Data Model

The graph data structure should be derived from EmDash-managed topic records.

### Topic Node

Expected fields:

- ID.
- Name.
- Slug.
- Short description.
- URL.
- Visibility.
- Visual priority.
- Optional accent color.
- Optional x/y placement hints.
- Optional featured article references.

### Topic Edge

Expected fields:

- Source topic ID.
- Target topic ID.
- Visibility.
- Optional priority.

Edges are unlabeled in V1.

### Graph Snapshot

The public Astro build should receive a graph navigation snapshot containing:

- Nodes.
- Edges.
- Build timestamp.
- Optional layout hints.

The snapshot must contain only published/visible topic data.

## Rendering Requirements

The graph navigation renderer should:

- Render topic nodes.
- Render unlabeled topic edges.
- Link each visible node to its topic page.
- Highlight related nodes on hover/focus where supported.
- Support keyboard navigation.
- Provide text labels for topics.
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

Recommended V1 default: start with a deterministic SVG/HTML graph renderer and add interaction progressively. Avoid a heavy canvas-only graph library until the topic count justifies it.

## Mobile Requirements

Mobile behavior remains an open design question.

Recommended V1 fallback:

- Use a simplified topic explorer instead of shrinking the full desktop graph.
- Show prioritized topics first.
- Expose related topics as chips or grouped links.
- Keep topic pages reachable through normal links.

## Editorial Controls

Editors should be able to:

- Create and edit topics.
- Connect related topics.
- Hide a topic from graph navigation without deleting it.
- Adjust visual priority.
- Optionally set an accent color.
- Optionally provide layout hints.

Editors should not need to understand graph algorithms to manage V1 navigation.

## Acceptance Criteria

- Topics can be managed in EmDash.
- Topic relationships can be managed in EmDash.
- The public build emits a graph navigation data structure from visible topics.
- Homepage renders graph-based topic navigation from that data structure.
- Every visible graph node links to a topic page.
- The graph degrades to accessible topic links without JavaScript.
- Mobile has a usable topic navigation fallback.
- The renderer does not add client-side analytics, cookies, or tracking.
- The graph still looks intentional with only three launch topics: news, initiatives, and essays.

## Open Questions

- Should V1 use a custom SVG/HTML renderer or a small graph library?
- Should layout be fully automatic, editor hinted, or deterministic from topic priority?
- What should the mobile topic explorer look like?
- Should topic nodes expose article counts?
- Should the homepage graph include public people later, or stay topic-only for V1?
