# TEMIS V1 PRD

Status: Draft  
Date: 2026-06-13

## Summary

TEMIS V1 is a public, static, EmDash-managed editorial website where readers discover articles, authors, tools, and themes through cool, tech-forward graph navigation.

V1 is a focused editorial product. Content relationships are a graph-based navigation and brand layer over articles, topics, tags, authors, and tools. V1 should prioritize publishing, reading, author discovery, graph-based exploration, and sharing.

The product direction is grounded in the [TEMIS vision](./vision.md): a public exploration space for people working through the future of open knowledge in a post-AI world.

## V1 Product Direction

TEMIS V1 should ship quickly and stay grounded in real content.

The V1 direction is:

1. Editorial discovery site.
2. Graph-based content navigation.
3. Clean public person/author pages.
4. Static public rendering from EmDash-managed content.

Future product ideas are intentionally kept outside the tracked V1 PRD until they become launch-relevant.

## Audience

TEMIS is public. Everyone enters through the same interface.

Primary reader profiles:

- Funders looking for emerging ideas, tools, and signals.
- Operators looking for useful context, tooling, and ecosystem patterns.
- Curious readers discovering the landscape.
- Potential contributors who may later help expand the publication.

V1 does not need persona-specific onboarding, dashboards, submission flows, or role-based experiences.

Authors, users, and people should be modeled as first-class content items where they are public-facing. A public author page is part of V1; public reader accounts are not.

## Goals

- Publish high-quality essays and articles announcing or contextualizing tools.
- Model tools as first-class graphable records without requiring a top-level tools menu.
- Give the site a strong editorial/data-like identity.
- Make content relationships explorable through graph-based navigation.
- Establish the content and technical scaffold for fast editorial iteration.
- Make people/authors visible through clean first-class profile pages.
- Drive readers to read and share.
- Keep the site fully static for public traffic.
- Keep content fully managed through EmDash.
- Prefer open-source, privacy-aware implementation choices and avoid unnecessary data collection.

## Non-Goals

- Public submissions.
- User accounts for public readers.
- Public governance flows.
- Appeals, conflict-of-interest workflows, or moderation queues.
- Additional public entity systems beyond articles, initiatives, tools, topics, tags, and people.
- Automated discovery systems.
- Public analytics dashboards.
- Personalized feeds.
- Behavioral tracking or third-party surveillance by default.
- Multi-persona landing pages.

## Core User Journey

1. A reader lands on the homepage.
2. The first impression communicates TEMIS as editorial, technical, and network-aware.
3. The reader sees or interacts with topic relationship navigation.
4. The reader selects a category, theme, or visible connection.
5. The reader lands on a category page or article list.
6. The reader opens an article, including essays or tool announcements.
7. The reader can inspect the author/person page behind the article.
8. The reader shares or follows a placeholder subscribe path.

## Content Scope

V1 content types:

- Article.
- Initiative.
- Tool.
- Person/author.
- Category/topic.
- Tag.
- Site settings.
- Navigation/menu settings.

Optional later V1 content types, only if needed:

- Static page.
- Newsletter landing page.

### Article

Purpose: editorial thinking, argument, landscape framing, opinionated synthesis, or tool announcement.

Article kinds:

- Essay.
- Tool announcement.

Expected fields:

- Title.
- Slug.
- Summary/dek.
- Kind.
- Category/topic assignments.
- Author/person assignments.
- Optional team/publication byline.
- Body.
- Featured visual.
- Publication date.
- SEO title.
- SEO description.
- Share image.
- Status: draft/published.

Tool announcement fields, when the article kind is `tool_announcement`:

- Tool name.
- Tool URL.
- Optional tool summary.

Tool announcements remain articles in V1. They may have visual treatment differences later, but they should use the same content model and reading flow as essays unless a concrete editorial need appears.

Tool announcement articles may link to a first-class tool record so the graph can connect the article, tool, authors, topics, and tags.

### Initiative

Purpose: represent high-level project or exploration axes that aggregate all content types around a shared idea.

Expected fields:

- Title.
- Slug.
- Short summary.
- Focus question.
- Why now.
- Desired outcome.
- Scope note.
- Longer description.
- Status.
- Steward.
- Start date.
- Related article assignments.
- Related publication assignments.
- Related tool assignments.
- Related person/author assignments with roles.
- Related category/topic assignments.
- Related tag assignments.
- Graph visibility.
- Graph priority.
- SEO title.
- SEO description.
- Status: draft/published.

Initiatives should function as public dossiers, not private project-management boards. They collect essays, tools, publications, people, topics, and tags around an exploration axis such as shared decision-making. Public initiative pages should expose the editorial brief and the grouped related records, while graph navigation shows the same relationships spatially.

### Tool

Purpose: represent tools as durable graphable objects that can be connected to articles, people, topics, and tags without forcing a public tools index in V1.

Expected fields:

- Name.
- Slug.
- Short summary.
- Longer description.
- Tool URL.
- Repository URL.
- Documentation URL.
- License.
- Privacy note.
- Technical maturity.
- Editorial confidence.
- Related article assignments.
- Related person/author assignments with roles.
- Related category/topic assignments.
- Related tag assignments.
- Optional featured visual.
- SEO title.
- SEO description.
- Status: draft/published.

Published tools should have public pages. `graph_visible` controls graph appearance only; it does not control whether a published tool page exists.

License and privacy note are required for public tool records. Technical maturity and editorial confidence are tracked separately: technical maturity describes the tool's development state, while editorial confidence describes TEMIS's confidence in the record as a useful public reference.

V1 does not require a top-level `Tools` menu item, but each visible tool node must link to its public tool page.

See [TEMIS V1 tool model](./tool-model-v1.md) for the detailed field and page contract.

### Person/Author

Purpose: represent public authors, contributors, and relevant people as durable first-class content items with clean public pages.

Expected fields:

- Name.
- Slug.
- Role/title.
- Short bio.
- Long bio.
- Portrait.
- Website URL.
- Social links.
- Affiliation.
- Related category/topic assignments.
- SEO title.
- SEO description.
- Status: draft/published.

Public people pages should list authored articles. CMS users and public person records may be related, but they should not be assumed to be the same object unless the implementation explicitly supports that safely.

### Category/Topic

Purpose: power V1 graph navigation and group related editorial content.

Expected fields:

- Name.
- Slug.
- Short description.
- Visual weight or priority.
- Related categories as unlabeled edges.
- Optional color/accent.
- SEO title.
- SEO description.

Category relationships should be editorially managed, manually edited, and unlabeled in V1.

### Tag

Purpose: provide lighter-weight graph and filtering vocabulary without turning every tag into a main category.

Expected fields:

- Name.
- Slug.
- Short description.
- Optional color/accent.
- Related category/topic assignments.
- SEO title.
- SEO description.
- Status: draft/published.

Tags should be graphable and reusable across articles, tools, and people. They should not automatically become top-level navigation.

## Graph-Based Content Navigation

V1 graph-based content navigation is editorially managed and content-driven.

See [graph navigation plugin PRD](./prd-graph-navigation-plugin-v1.md) for the focused plugin/data-structure requirements.

It should behave as:

- A homepage visual anchor.
- A navigation model.
- A way to move between themes, content, authors, tags, and tools.

It should not behave as:

- A database of everything TEMIS may later cover.
- An automatically generated discovery system.
- A replacement for clear article and topic pages.

### Navigation Requirements

- Render typed nodes for articles/content, category/topics, tags, authors, and tools.
- Show editorially configured relationships as visually unlabeled edges.
- Let users navigate from a node to the appropriate public destination.
- Use a graph-shaped data structure that can be rendered by either a static component or an interactive graph plugin.
- Prefer an interactive graph plugin for the homepage if it can remain accessible, responsive, and build-safe.
- Support responsive desktop and mobile experiences.
- Degrade gracefully if there are few categories at launch.
- Avoid visual clutter by allowing editorial priority/visibility controls.
- Keep tools graphable without adding a top-level tools menu item in V1.

## Visual And UX Direction

See [design system direction](./design-system.md) for the V1 design proposal.

The interface should feel:

- Editorial.
- Data-like.
- Technical.
- Network-aware.
- Public and accessible.
- Exploratory.
- Open to uncertainty without feeling careless.

The visual system should support both dark and light themes.

The site should not feel:

- Like a SaaS landing page.
- Like a dashboard for logged-in users.
- Like a generic blog template.
- Like a full social network.

The homepage should make content relationships visible in the first viewport, while still making it obvious that the primary activity is reading.

## Calls To Action

Primary CTAs:

- Share.

Subscription delivery is deferred to V1.5. V1 may include a placeholder subscribe CTA only if it does not require the subscription plugin. See [V1.5 subscription delivery plugin PRD](./prd-v1-5-subscription-plugin.md).

Sharing should start with native share where supported, copy link everywhere, and `mailto:` email fallback.

Secondary CTAs:

- Explore related content.
- Browse by category.

V1 does not need contact, submit, sign in, contribute, or fund flows unless later explicitly added.

## Open Source And Privacy Posture

TEMIS should be designed to become a very open-source and privacy-aware project.

V1 implementation expectations:

- Prefer open-source components and services.
- Prefer copyleft-compatible choices when practical and document licensing tradeoffs when not.
- Do not use tracking cookies.
- Do not add client-side reader tracking, fingerprinting, or third-party surveillance.
- Measure V1 with server/platform operational signals only.
- Make author/person data explicit, editable, and intentionally published rather than inferred from private CMS user data.
- Publish website content under `CC-BY-SA-4.0`.
- Keep imported source material, generated exports, and local archives out of git unless explicitly approved.

## Technical Requirements

- Public site is static Astro.
- Content is authored and managed in EmDash.
- Only published content is included in public static builds.
- Draft preview happens through the EmDash/CMS preview surface.
- Public deploy runs on Cloudflare Pages.
- CMS runs on Cloudflare Workers.
- Content storage uses D1.
- Media storage uses R2.
- SEO/GEO editorial evaluation uses `@aeptus/aexeo-emdash` in the EmDash workflow.
- Images are optimized at build time where practical.
- Publishing in EmDash triggers a Cloudflare Pages rebuild through a deploy hook.
- The public build should be compatible with a future public/open-source repository posture.
- Public pages must not require client-side analytics, tracking cookies, or reader fingerprinting.

## Success Metrics

Primary launch metrics:

- Readers.
- Shares.
- Qualitative signal: people talking about TEMIS.

Metrics should be collected in a privacy-aware way. V1 should not require cross-site tracking or personalized reader profiles to measure success.

V1 metrics must come from server/platform operational signals and explicit user actions only. No client-side analytics, tracking cookies, or passive reader profiling should be added.

Operational metrics:

- Number of published essays/tool announcements.
- Number of categories with enough content to feel useful.
- Static build success rate.
- Time from publish in EmDash to public deployment.
- Aggregate public request counts, bandwidth, status codes, and cache behavior from Cloudflare.
- CMS Worker success/error/invocation, CPU, wall-time, subrequest, and duration metrics.

## V1 Acceptance Criteria

- A public homepage introduces TEMIS and exposes content relationship navigation.
- At least one essay-style article and one tool-announcement article can be published from EmDash and rendered statically.
- At least one person/author page can be published from EmDash and rendered statically.
- Articles can link to one or more public person/author pages.
- Category/topic nodes can be managed in EmDash.
- Graph edges are visually unlabeled in V1.
- A graph-shaped content navigation data structure exists and can render homepage and topic-page navigation.
- Initiatives can be created as first-class aggregation records and connected to articles, publications, tools, topics, tags, and people.
- Tools can be created as first-class graphable records and connected to articles, topics, tags, and people.
- If an interactive graph plugin is used, it degrades to accessible links when JavaScript is unavailable or the viewport is constrained.
- Category/topic pages list related content.
- Articles include share affordances.
- Published-only filtering works.
- Draft preview works from the CMS surface.
- Cloudflare Pages rebuild can be triggered from the CMS publish flow.
- The public site has no public submission or login requirement.
- The visual system clearly signals editorial/data-like/network direction.

## Open Questions Before Final PRD Approval

See [open questions](./open-questions.md) for the canonical V1 question list.
