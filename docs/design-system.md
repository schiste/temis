# TEMIS V1 Design System Direction

Status: Draft  
Date: 2026-06-13

## Design Thesis

TEMIS should feel like an editorial atlas for open knowledge exploration.

The V1 design system should support reading first, then discovery. It should make the topic graph feel like a map readers can use to move through ideas, not a decorative technology signal.

The working-group posture is: we are explorers. The interface should therefore make room for curiosity, uncertainty, detours, and return paths while staying calm, legible, and trustworthy.

For designer-facing creative direction, see the [V1 creative brief](./creative-brief.md).

## Experience Principles

### 1. Field Notes, Not Marketing

The site should communicate that ideas are being explored in public.

Use editorial structures, visible metadata, topic trails, author context, and related reading paths. Avoid over-polished marketing sections that imply the project already knows every answer.

### 2. Map The Terrain

Topic navigation should feel like orientation through a landscape.

The graph should show adjacency and possible routes. It should not claim to be a complete knowledge graph or an authority layer over the field.

### 3. Reading Is The Primary Action

The graph exists to help readers find articles.

Every visual navigation element should lead back to readable content: essays, news, tool announcements, topic pages, and people pages.

### 4. Exploration Must Feel Safe

The interface should encourage readers and authors to follow incomplete thinking without making the site feel careless.

Use clear summaries, careful typography, visible authorship, publication dates, and explicit topic context. Avoid shaming, ranking, or popularity mechanics in V1.

### 5. Open And Privacy-Aware By Default

The design should not rely on surveillance patterns.

No manipulative cookie banners, growth-hacking widgets, engagement traps, or client-side tracking affordances should be part of the V1 visual language.

## Visual Direction

The recommended direction is **editorial cartography**.

TEMIS should combine:

- A serious editorial publication.
- A public map.
- A research field notebook.
- A lightweight technical commons.

It should not look like:

- A SaaS dashboard.
- A generic AI startup landing page.
- A crypto/cyberpunk interface.
- A social network.
- A personal blog theme.

## Foundations

### Typography

- Use a highly readable text face for articles.
- Use a precise sans-serif for navigation, metadata, controls, and topic labels.
- Use monospace sparingly for structured metadata, graph labels, IDs, or system-like details.
- Keep article pages comfortable for long reading.

### Color

- Support both light and dark themes from the start.
- Use neutral editorial surfaces with strong contrast.
- Use one primary accent for active navigation and selected graph state.
- Use secondary accents only where they clarify topic grouping.
- Avoid one-note blue/purple AI gradients and decorative color effects.

### Layout

- Favor article readability, compact indexes, and clear topic paths.
- Use thin rules, metadata rows, and spatial grouping before heavy card styling.
- Keep cards for repeated items only, such as article summaries or people listings.
- Do not put UI cards inside other cards.

### Shape And Texture

- Prefer crisp, technical geometry: modest radii, clean borders, rules, and map-like lines.
- Use graph lines, trails, coordinate hints, and index-like treatments as recurring motifs.
- Avoid large decorative blobs, vague gradients, and purely atmospheric backgrounds.

### Motion

- Use subtle motion only where it improves orientation.
- Graph hover, focus, and selected states may animate lightly.
- Support `prefers-reduced-motion`.
- Avoid motion that makes reading, scanning, or mobile navigation harder.

## Core Templates

V1 should design and implement only the templates needed to ship:

- Homepage with editorial entry points and topic graph navigation.
- Article page.
- Topic page.
- Person/author page.
- Article index.
- Topic index.
- People index.
- Basic static page, if needed.

## Component Set

Initial V1 components:

- Site header.
- Theme switcher.
- Article summary.
- Article metadata row.
- Topic chip.
- Topic graph.
- Related topics module.
- Related articles module.
- Person summary.
- Author byline.
- Share controls.
- License notice.
- Footer.

Subscription UI should remain a placeholder until the V1.5 subscription plugin is built.

## Graph Design Rules

The V1 graph is a navigation map.

- Nodes represent topics.
- Edges represent unlabeled editorial relationships.
- Selecting a topic should expose a path to that topic page and related articles.
- The graph should remain understandable with only a few launch topics.
- Mobile should use a simplified topic explorer or list-first fallback rather than a shrunken desktop graph.
- The graph must degrade to accessible links when JavaScript is unavailable.

## Content Tone

The interface copy should sound:

- Curious.
- Precise.
- Open.
- Comfortable with uncertainty.
- Serious about open knowledge.

It should avoid:

- Hype.
- Fake urgency.
- Overconfident claims.
- Corporate slogan language.
- Gamified engagement language.

## V1 Design Acceptance Criteria

- The homepage makes TEMIS feel like a content-first exploration space.
- Readers can understand that the graph is a navigation tool.
- Articles remain easy to read in light and dark themes.
- Topic pages make exploration feel intentional even with a small content set.
- Person pages provide trust and context without becoming social profiles.
- The visual system expresses openness and privacy without needing explanatory banners.
