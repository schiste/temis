# TEMIS V1 Design System

Status: Draft  
Date: 2026-06-14  
Audience: designers and developers  
Scope: V1, with foundations durable enough for later evolution

## Purpose

This document describes the TEMIS V1 design system: the product vision,
visual principles, core sizing logic, design tokens, component rules, and
template expectations for the public static website.

It is descriptive rather than final implementation law, but it should be
specific enough for designers and developers to make aligned decisions
without recreating the art direction from scratch.

## Design Thesis

TEMIS should feel **structured and open**.

The strongest metaphor is a **public map of a technical commons**. The site is
an editorial publication, but its deeper promise is orientation: readers should
feel that they are entering an explorable landscape of open knowledge,
technical experiments, essays, people, and topic relationships.

TEMIS is not an AI community interface, a SaaS dashboard, a generic AI startup,
a crypto/cyberpunk surface, a social network, or a personal blog theme.

The site should be experimental and exploratory, but still calm, readable,
and trustworthy. The working-group idea of "we are explorers" should be
expressed through layout, navigation, motion, graph behavior, metadata, and
visual structure rather than through explicit slogan-like interface copy.

## Core Principles

### 1. Structured Openness

The interface should make room for exploration without becoming vague.

Use clear hierarchy, visible metadata, legible typography, strong information
architecture, and graph-based topic routes. The reader should always know where
they are, what they can read next, and how topics connect.

### 2. Public Map Of A Technical Commons

TEMIS should make the commons feel navigable.

The topic graph is a first-class navigation object and a brand signal. It
should feel like a constellation map: connected, luminous, exploratory, and
slightly futuristic. It must remain a route into content, not a decorative
background.

### 3. Reading First, Discovery Around It

Articles remain the core user experience.

Graph navigation, topic labels, author context, metadata, related links, and
share controls should all bring readers back to essays, news, tool
announcements, topic pages, and people pages.

### 4. Experimental Without Carelessness

The site can feel exploratory, but every page should still feel edited.

Use summaries, bylines, dates, topic context, consistent spacing, and careful
contrast. Avoid hype, ranking mechanics, popularity signals, fake urgency, and
engagement traps.

### 5. Phi-Based Proportion

TEMIS uses a rounded golden-ratio system as its sizing foundation.

The system should stay as close as practical to `1.618` while allowing caps and
exceptions for readability, accessibility, and responsive behavior. Typography,
spacing, layout columns, graph nodes, icon sizes, line weights, and component
dimensions should derive from this scale where practical.

### 6. Hard Geometry

No rounded corners or soft edges.

The default shape language is angular, crisp, and technical:

- `border-radius: 0` by default.
- No pill buttons.
- No rounded cards.
- No rounded chips.
- No circular avatars.
- No circular graph nodes.
- No rounded image masks.
- No blob shapes.
- No gradient orbs.
- No soft neumorphic containers.

Allowed geometric forms include rectangles, squares, diamonds, brackets,
crosshairs, coordinate ticks, thin rules, hard panels, diagonal cuts, and
map-like linework. Any future exception to rounded geometry should be explicit
and documented.

### 7. Privacy-Aware By Design

The design should not need a banner to prove it is privacy-aware.

Avoid tracking-looking affordances, manipulative consent surfaces, growth-hack
widgets, dark patterns, and passive surveillance UI. Share and subscribe flows
should be explicit actions.

## Golden Ratio Foundation

### Ratio

Use the rounded golden ratio:

```css
:root {
  --ratio-phi: 1.618;
}
```

Use rounded values for implementation. Do not force mathematical purity when it
would harm readability, fit, or accessibility.

### Base

The base size is `16px`.

```css
:root {
  --size-base-px: 16px;
  --size-base-rem: 1rem;
}
```

### Spacing Scale

Spacing uses rounded phi steps around the `16px` base.

```css
:root {
  --space-0: 0;
  --space-phi-000: 0.125rem; /* 2px */
  --space-phi-00: 0.25rem; /* 4px */
  --space-phi-0: 0.375rem; /* 6px */
  --space-phi-1: 0.625rem; /* 10px */
  --space-phi-2: 1rem; /* 16px */
  --space-phi-3: 1.625rem; /* 26px */
  --space-phi-4: 2.625rem; /* 42px */
  --space-phi-5: 4.25rem; /* 68px */
  --space-phi-6: 6.875rem; /* 110px */
  --grid-unit: var(--space-phi-4);
  --grid-pair: calc(var(--grid-unit) * 2);
}
```

Usage guidance:

- `--space-phi-00` and `--space-phi-0`: hairline gaps, icon offsets, dense metadata.
- `--space-phi-1`: compact controls and inline component spacing.
- `--space-phi-2`: default component padding.
- `--space-phi-3`: section internal rhythm.
- `--space-phi-4`: major template spacing.
- `--space-phi-5` and above: homepage and large editorial moments only.

### Typography Scale

Typography uses a capped phi scale. The large steps are useful for strong
editorial identity, but article readability takes priority over strict ratios.

```css
:root {
  --font-size-caption: 0.625rem; /* 10px */
  --font-size-meta: 0.75rem; /* 12px */
  --font-size-body: 1rem; /* 16px */
  --font-size-body-lg: 1.125rem; /* 18px readability exception */
  --font-size-title-sm: 1.625rem; /* 26px */
  --font-size-title-md: 2.625rem; /* 42px */
  --font-size-title-lg: 4.25rem; /* 68px, capped hero use */
}
```

Usage guidance:

- Body text starts at `16px`; long-form article body may use `18px` if line
  length and rhythm remain controlled.
- `26px` is the default compact heading size.
- `42px` is the primary page-title size on desktop.
- `68px` is reserved for rare hero-scale homepage or graph-led moments.
- Do not scale type directly with viewport width.
- Letter spacing should default to `0`.

### Layout Ratios

Use phi relationships for major layout decisions.

```css
:root {
  --layout-major: 61.8%;
  --layout-minor: 38.2%;
  --grid-columns-prose: 16;
  --grid-columns-wide: 26;
  --grid-columns-chrome: 28;
  --grid-columns-page: 42;
  --measure-prose: calc(var(--grid-unit) * var(--grid-columns-prose));
  --measure-wide: calc(var(--grid-unit) * var(--grid-columns-wide));
  --measure-chrome: calc(var(--grid-unit) * var(--grid-columns-chrome));
  --measure-page: calc(var(--grid-unit) * var(--grid-columns-page));
}
```

Recommended layout uses:

- Homepage graph/editorial split: graph as the major visual field, articles or
  editorial entry points visible above the fold.
- Article layout: centered editorial reading column, with metadata integrated
  before and around the article rather than persistent dashboard sidebars.
- Site chrome: header and footer should start on the page grid and span whole
  grid units unless a template explicitly needs full-page operational density.
- Footer cells on desktop should use whole grid spans. The V1 footer uses
  `7 + 7 + 7 + 5 + 2` units across a 28-unit chrome measure.
- The page shell should snap down to the largest fitting grid width and center
  itself. Any viewport remainder belongs in the outer gutters, not inside
  component sizing.
- Component outer boxes should use grid spans. Component internals may use
  spacing tokens for padding and icon offsets.
- Topic pages: editorial landing pages that feel like entry points into a new
  world of content.
- Person pages: biography and trust context first, authored work second.

### Shape, Stroke, And Icon Tokens

```css
:root {
  --radius-none: 0;
  --stroke-hairline: 1px;
  --stroke-map: 1.5px;
  --stroke-strong: 2px;
  --icon-sm: 1rem; /* 16px */
  --icon-md: 1.625rem; /* 26px */
  --graph-node-sm: 0.625rem; /* 10px */
  --graph-node-md: 1rem; /* 16px */
  --graph-node-lg: 1.625rem; /* 26px */
}
```

All strokes should use square or butt caps where the technology allows it.
Avoid rounded line caps unless an implementation constraint makes that
impractical.

## Typography

TEMIS should use both serif and sans-serif typography.

Recommended direction:

- Serif for long-form editorial reading, essays, and article body.
- Sans-serif for navigation, UI controls, graph labels, summaries, indexes,
  captions, and topic pages.
- Monospace for structured metadata, graph coordinates, IDs, technical hints,
  data labels, and small system-like details.

The typefaces should be open source and carry meaning. Recommended candidates:

- Serif: **Fraunces**, **Newsreader**, **Literata**, or **Source Serif 4**.
- Sans-serif: **Inter**, **IBM Plex Sans**, **Atkinson Hyperlegible**, or
  **Source Sans 3**.
- Monospace: **IBM Plex Mono**, **JetBrains Mono**, or **Source Code Pro**.

Preferred initial recommendation:

- Article serif: `Source Serif 4` or `Literata`.
- Interface sans-serif: `IBM Plex Sans`.
- Monospace: `IBM Plex Mono`.

Why: the IBM Plex family carries technical and open-source connotations, while
Source Serif 4 or Literata keeps article reading serious and editorial.

## Color

Theme selection should follow the user's system preference by default.

The palette should feel calm, luminous, and slightly futuristic. It should not
lean into generic AI blue-purple gradients as the primary identity, but there is
no banned color family beyond avoiding generic or one-note AI-community tropes.

### Token Structure

Define colors by role, not by one-off names:

```css
:root {
  --color-canvas: ;
  --color-surface: ;
  --color-panel: ;
  --color-text: ;
  --color-text-muted: ;
  --color-line: ;
  --color-line-strong: ;
  --color-accent: ;
  --color-accent-contrast: ;
  --color-topic-a: ;
  --color-topic-b: ;
  --color-topic-c: ;
  --color-focus: ;
}
```

### Light Theme Direction

Light mode should feel like a luminous editorial map: clear paper-like
surfaces, dark text, fine rules, and precise accent color.

Use:

- High contrast text.
- Off-white or quiet neutral canvas.
- Subtle panel separation through rules before fills.
- Accent color for graph focus, active navigation, and selected topics.

### Dark Theme Direction

Dark mode should feel like a night reading mode unless the final visual design
makes dark the primary identity.

Use:

- Deep canvas, not pure black by default.
- Luminous graph lines and topic accents.
- Soft enough contrast for long reading.
- Clear focus and hover states.

### Topic Colors

Topics may have colors, but they must be used consistently.

If a topic gets an accent, that accent should appear across:

- Graph node state.
- Topic page marker.
- Topic label/chip.
- Related topic modules.
- Article metadata where that topic is primary.

Do not use random topic colors per component instance.

## Layout System

### Responsive Breakpoints

Use named breakpoints, not arbitrary one-offs:

```css
:root {
  --breakpoint-xs: 26rem; /* 416px */
  --breakpoint-sm: 42rem; /* 672px */
  --breakpoint-md: 68rem; /* 1088px */
  --breakpoint-lg: 110rem; /* 1760px */
}
```

These are phi-derived container thresholds. Implementations may map them to the
framework's breakpoint system, but the design rationale should remain visible.

### Page Shell

The page shell should feel open and structured:

- Hard-edged header.
- Clear navigation.
- Strong graph presence.
- Article routes visible early.
- Footer with licensing, source/open posture, and essential navigation.

Avoid heavy marketing sections, decorative cards, or nested card structures.

### Cards And Panels

Cards are allowed, especially for article and person indexes, but they should be
hard-edged panels.

Rules:

- `border-radius: 0`.
- Use thin rules, type hierarchy, metadata, and spacing to create structure.
- Avoid cards inside cards.
- Avoid soft shadows as the main separation tool.
- Prefer borders, hard planes, and spatial rhythm.

## Graph Navigation

The V1 graph is a strong visual and navigation signature.

Direction:

- Constellation-like.
- Topic-only in V1.
- Organic relationship lines.
- Motion by default where useful.
- Accessible, static fallback always present.

### Nodes

Nodes represent topics. They should not be circular.

Recommended node treatments:

- Square coordinate markers.
- Diamond markers.
- Crosshair markers.
- Bracketed labels.
- Hard-edged label plates.

Every visible node links to a topic page.

### Edges

Edges are unlabeled editorial relationships.

They may be organic in path, but should keep a technical map quality:

- Thin strokes.
- Square or butt line caps where possible.
- No glowing spaghetti.
- No heavy force-directed chaos.
- No implied relationship labels in V1.

### Motion

Motion should make orientation clearer.

Allowed:

- Node focus transitions.
- Edge emphasis on hover/focus.
- Slow constellation drift if it does not hurt readability.
- Selected-topic path reveal.

Reduced-motion mode should preserve useful graph states where possible rather
than disabling the graph entirely. Remove only non-essential movement.

### Mobile

Mobile graph behavior remains an open design question.

Recommended default for prototyping:

- Do not shrink the full desktop constellation into an unreadable viewport.
- Use a simplified topic explorer.
- Show prioritized topics first.
- Show related topics as hard-edged labels or a compact relationship list.
- Keep the graph data structure intact so the mobile renderer can evolve.

## Components

All components must use hard geometry and phi-derived spacing.

### Header

Priority: first component to specify and implement.

The header should be visibly interactive but not marketing-heavy.

Required elements:

- TEMIS wordmark or text mark.
- Primary navigation.
- Theme switcher.
- Optional compact topic/explore entry.

Rules:

- Hard bottom rule.
- No rounded nav pills.
- Active states use hard underline, left bar, bracket, or filled angular plate.
- Header should not become a dashboard toolbar.

### Footer

Priority: first component to specify and implement with the header.

Required elements:

- License statement.
- Content license reference, preferably `CC-BY-SA-4.0`.
- Open-source/source link when available.
- Privacy posture in concise form.
- Basic navigation.

Article-level license can live in the footer for V1, with optional article
license modules later if content needs clearer attribution.

### Buttons

Buttons should be visibly interactive.

Rules:

- Rectangular.
- No rounded corners.
- Clear hover/focus/active states.
- Icons are encouraged where commands are familiar.
- Primary actions may use filled angular plates.
- Secondary actions may use outline plates.

### Topic Labels

Recommendation: topic labels should feel like map labels or coordinate plates,
not social-media tags.

Use:

- Hard-edged label plates.
- Brackets.
- Small coordinate marks.
- Topic accent color used consistently.
- Optional monospace prefixes for index-like topic codes.

Avoid:

- Rounded chips.
- Hashtag-like social tags as the main visual.
- Random color assignment.

### Metadata Rows

Metadata should be secondary but structured.

Use:

- Date.
- Author/person link.
- Reading context where available.
- Topic labels.
- License or source indicators where useful.

Metadata should support trust without overwhelming article reading.

### Article Summary Cards

Article summaries may use cards/panels.

Rules:

- Hard-edged panels.
- Title, summary, metadata, and topic labels.
- Optional featured visual.
- No rounded thumbnails.
- No nested cards.

### Person Summary

Person summaries and people pages should lead with biography and trust context.

Rules:

- Portraits are optional.
- Portraits, if used, are rectangular or angular.
- No circular avatars.
- Authored work appears after identity/context.

### Share Controls

V1 can start with non-social controls:

- Native share where supported.
- Copy link.
- Email fallback.

Social buttons are acceptable later, but they must not introduce tracking,
third-party scripts, or brand-heavy visual noise.

### License Notice

For V1, license information can live in the footer. Article-level license
notices may be added later if attribution, syndication, or reuse needs become
more explicit.

## Imagery

V1 imagery should be mixed.

Use:

- Optional article featured visuals.
- Generated abstract maps.
- Editorial diagrams.
- Hard-edged data/topology visuals.
- Typographic placeholders.
- Rectangular portraits when available.

Avoid:

- Generic stock imagery.
- Blurred AI backgrounds.
- Decorative orbs and blobs.
- Rounded image masks.
- Purely atmospheric images that do not help the reader understand the content.

### Map Plates And Field-Note Illustrations

A "map plate" or "field-note illustration" means a reusable, hard-edged
editorial visual: coordinate grids, annotated topology fragments, structured
diagrams, graph crops, index plates, or abstract maps.

This is optional for V1. It may become useful if early articles need meaningful
visuals before custom artwork exists.

## Templates

### Homepage

The homepage should be graph-dominant while still showing articles above the
fold.

Required:

- Strong topic graph presence.
- Editorial entry points visible immediately.
- Clear path into articles.
- Hard-edged layout.
- No marketing hero card.

### Article Page

Start with a full editorial article approach.

Required:

- Strong title.
- Summary/dek where available.
- Structured metadata row.
- Topic labels.
- Author/person link.
- Comfortable reading measure.
- Optional featured visual.
- Share controls.

### Topic Page

Topic pages should feel like editorial landing pages and entries into new
worlds of content.

Required:

- Topic title and description.
- Related topic links.
- Related article list.
- Optional mini graph or relationship module.
- Consistent topic accent if set.

### Person Page

Person pages should emphasize biography first.

Required:

- Name.
- Role/title or affiliation when available.
- Bio.
- Optional portrait.
- External links.
- Authored articles.
- Related topics where useful.

### Index Pages

Article, topic, and people indexes can use hard-edged cards or dense lists,
depending on content volume.

## Accessibility

Target WCAG 2.2 AA.

Requirements:

- Strong color contrast in both light and dark themes.
- Keyboard navigation for graph and all controls.
- Visible rectangular focus states.
- Reduced-motion support.
- No content hidden only behind pointer hover.
- Graph fallback as accessible links.
- Text must not overlap or overflow controls at mobile widths.

Reduced motion should not remove useful orientation if a non-animated state can
serve the same purpose.

## Privacy And Open Posture

Privacy should be implicit in the design.

Do not add:

- Client-side analytics UI.
- Cookie-banner-shaped growth patterns.
- Tracking consent dark patterns.
- Third-party social widgets.
- Personalized feed affordances.

Do add:

- Clear footer license.
- Open-source/source links when available.
- Explicit share actions.
- Transparent editorial metadata.

## Do And Do Not

Do:

- Use hard-edged geometry.
- Use phi-derived spacing.
- Make the graph a strong navigation signature.
- Keep article reading comfortable.
- Use topic colors consistently.
- Prefer metadata, rules, and structure over decoration.
- Make interactive controls visibly interactive.

Do not:

- Use rounded corners.
- Use circular avatars or graph nodes.
- Use pill chips.
- Use decorative blobs, orbs, or generic gradients.
- Make TEMIS look like an AI community platform.
- Hide reading behind visual effects.
- Add tracking-looking UI patterns.

## Implementation Notes

The first implementation should define tokens before building templates.

Minimum token groups:

- Ratio.
- Spacing.
- Typography.
- Layout measures.
- Breakpoints.
- Color roles.
- Stroke widths.
- Icon sizes.
- Graph node sizes.
- Radius, fixed to `0`.

Minimum first components:

1. Header.
2. Footer.
3. Article shell.
4. Topic graph shell.
5. Article summary.
6. Topic label.
7. Person summary.

## Open Design Questions

- What exact open-source font pairing should TEMIS adopt?
- Should the default visual theme feel primarily light/system-led, or should
  dark become the main identity after design exploration?
- What is the best mobile topic explorer pattern?
- Should V1 introduce map plates/field-note illustrations, or wait until real
  content reveals the need?
- When social sharing buttons are added, which services are acceptable without
  compromising privacy and performance?
