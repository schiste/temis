# TEMIS V1 Creative Brief

Status: Draft  
Date: 2026-06-13

## Project

TEMIS is the V1 codename for a public editorial website about the future of open knowledge in a post-AI world.

The site will be fully static, content-first, and managed through EmDash. V1 will publish essays, news, tool announcements, topic pages, and public people/author pages. It will also introduce graph-based topic navigation as a first step toward a broader network/federation identity.

## Source Documents

- [Vision](./vision.md)
- [V1 PRD](./prd-v1.md)
- [Design system direction](./design-system.md)
- [Graph navigation plugin PRD](./prd-graph-navigation-plugin-v1.md)

## Core Idea

TEMIS is a place for explorers of open knowledge.

The group is not defined by one approved direction. People may explore different paths, share incomplete ideas, circle back, fail, stumble, and be wrong. The shared purpose is to help open knowledge survive, adapt, and remain meaningful in a post-AI world.

The design should make that posture visible without becoming chaotic or unserious.

## Creative Challenge

Design a public site that feels like:

- A serious editorial publication.
- A public map of ideas.
- A research field notebook.
- A lightweight technical commons.

It should help readers feel they are entering an active exploration space, not a finished institution, a startup marketing page, or a social network.

## Desired First Impression

When someone lands on TEMIS, they should quickly understand:

- This is about open knowledge after AI.
- The group is exploring in public.
- The site publishes serious, readable editorial content.
- Topics are connected and explorable.
- The project values openness, privacy, and shared knowledge.

## Audience

V1 has one public interface for everyone.

Primary readers:

- Funders looking for emerging ideas, signals, and credible people.
- Operators looking for context, tools, and practical ecosystem patterns.
- Curious readers discovering the landscape.
- Potential contributors who may later help expand the publication.

The design should not optimize for a single persona or create separate pathways by role.

## Brand Personality

TEMIS should feel:

- Curious.
- Precise.
- Open.
- Exploratory.
- Literate.
- Technical.
- Calm.
- Purposeful.

TEMIS should not feel:

- Hype-driven.
- Corporate.
- Doctrinal.
- Overconfident.
- Gamified.
- Surveillance-oriented.
- Cyberpunk.
- Generic AI.

## Visual Direction

Recommended territory: **editorial cartography**.

Use visual cues from:

- Atlases and maps.
- Field notes.
- Public archives.
- Research indexes.
- Network diagrams.
- Technical documentation.

Avoid:

- Generic AI gradients.
- Abstract glowing blobs.
- Crypto/cyberpunk aesthetics.
- Startup SaaS hero sections.
- Dashboard-heavy layouts.
- Social-media engagement patterns.
- Decorative graph visuals that do not help navigation.

## Design Principles

### Reading First

Articles are the primary product. The typography, spacing, and article template should make long-form reading comfortable in light and dark themes.

### Graph As Orientation

The graph is a map for navigating topics. It should suggest adjacency, paths, and return routes. It should not imply total knowledge or algorithmic authority.

### Exploration Without Carelessness

The interface should welcome unfinished thinking while preserving trust through clear metadata, authorship, dates, summaries, topics, and related reading.

### Technical But Human

TEMIS can use data-like visual language, but it should stay readable and humane. The system should feel built for public knowledge, not machine dashboards.

### Open By Default

Privacy and openness should be visible through restraint: no dark-pattern banners, no tracking widgets, no artificial urgency.

## V1 Pages To Design

Required:

- Homepage.
- Article page.
- Topic page.
- Person/author page.
- Article index.
- Topic index.
- People index.

Optional if useful:

- Basic static page.
- Placeholder subscription/updates page, with no working subscription flow until V1.5.

## Core Components To Define

- Site header.
- Footer.
- Theme switcher.
- Article summary/list item.
- Article metadata row.
- Author byline.
- Topic chip.
- Topic graph/navigation module.
- Related topics module.
- Related articles module.
- Person summary.
- Share controls.
- License notice.

## Graph Navigation Requirements

The graph design should work with V1 content:

- Nodes are topics.
- Edges are unlabeled editorial relationships.
- The graph should look intentional with only three starter topics: news, initiatives, and essays.
- Every topic node must have a clear path to a topic page.
- The graph must have an accessible non-JavaScript fallback.
- Mobile should not be a shrunken desktop graph; propose a simplified explorer or list-first alternative.

## Theme Requirements

Design both light and dark modes from the start.

Light mode should not feel like a generic blog. Dark mode should not become neon/cyberpunk. Both should preserve editorial trust, contrast, and long-reading comfort.

## Accessibility And Privacy Constraints

- Design for keyboard navigation and visible focus states.
- Respect reduced-motion users.
- Keep graph interactions understandable without hover-only behavior.
- Do not require client-side tracking, cookies, personalization, or third-party analytics.
- Avoid manipulative consent or growth patterns.

## Deliverables Requested

### 1. Art Direction

Provide one recommended visual direction and, if helpful, one alternative direction for comparison.

Include:

- Moodboard or reference board.
- Rationale.
- What to avoid.
- How the direction expresses exploration and open knowledge.

### 2. Design Tokens

Define an initial V1 token set:

- Color tokens for light and dark themes.
- Typography scale.
- Spacing scale.
- Border/radius rules.
- Focus states.
- Motion principles.

### 3. Page Mockups

Create desktop and mobile designs for:

- Homepage.
- Article page.
- Topic page.
- Person/author page.

Lower-fidelity layouts are acceptable for index pages if the core system is clear.

### 4. Graph Navigation Concept

Provide:

- Desktop graph treatment.
- Mobile graph fallback.
- Hover/focus/selected states.
- Empty/small-content state.
- Guidance on when graph labels, article counts, or descriptions appear.

### 5. Component Reference

Provide enough component detail for implementation in Astro:

- Header.
- Footer.
- Article summary.
- Topic chip.
- Author/person summary.
- Share controls.
- Related content modules.
- License notice.

## Implementation Notes

The site will be implemented in Astro and generated statically. The design should favor durable HTML/CSS patterns over heavy client-side interaction.

The topic graph may begin as a deterministic SVG/HTML renderer with progressive enhancement. Avoid design assumptions that require a heavy canvas-only library.

Cards should be used carefully for repeated items only. Page sections should not feel like stacked marketing cards.

## Open Questions For The Designer

- What is the strongest visual metaphor for "exploration" without making the site feel playful or unserious?
- How can the homepage make both reading and graph navigation visible without splitting attention?
- What should the mobile topic navigation pattern be?
- Should topics have color families in V1, or should color remain mostly semantic and restrained?
- What kind of imagery or illustration can support early lorem ipsum content without feeling generic?

## Success Criteria

The design is successful if:

- TEMIS feels distinctive before the final public name is chosen.
- The first viewport communicates editorial exploration and networked topics.
- Articles are highly readable.
- The graph feels useful rather than decorative.
- Topic and person pages feel first-class.
- The visual system can be implemented incrementally for V1.
- The site clearly avoids generic AI/startup aesthetics.
