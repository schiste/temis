# TEMIS V1 PRD

Status: Draft  
Date: 2026-06-13

## Summary

TEMIS V1 is a public, static, EmDash-managed editorial website where readers discover articles, authors, and themes through a cool, tech-forward category graph.

V1 is not yet a full ecosystem database. The graph is a navigation and brand layer over content categories, using unlabeled editorial edges between topics. It should make the future network and federation ambition visible without requiring initiative-level entities, public submissions, governance workflows, recommendations, matchmaking, or ecosystem analytics.

## Long-Term Product Direction

TEMIS is a coordination commons helping ideas become initiatives and initiatives become outcomes.

The long-term trajectory is:

1. V1: editorial discovery site with graph-like category navigation and clean author/person pages.
2. V2: initiative graph and richer entity relationships.
3. V3: federation, matchmaking, opportunity discovery, and ecosystem analytics.

V1 must preserve that direction visually and structurally, but it should only ship the editorial surface and the category graph scaffold.

## Audience

TEMIS is public. Everyone enters through the same interface.

Primary reader profiles:

- Funders looking for emerging ideas, tools, and signals.
- Operators looking for useful context, tooling, and ecosystem patterns.
- Curious readers discovering the landscape.
- Future contributors who may later help expand the graph.

V1 does not need persona-specific onboarding, dashboards, submission flows, or role-based experiences.

Authors, users, and people should be modeled as first-class content items where they are public-facing. A public author page is part of V1; public reader accounts are not.

## Goals

- Publish high-quality essays and articles announcing or contextualizing tools.
- Give the site a strong editorial/data-like identity.
- Make category-level relationships explorable through a graph-inspired navigation experience.
- Establish the content and technical scaffold for a future initiative graph.
- Make people/authors visible through clean first-class profile pages.
- Drive readers to subscribe and share.
- Keep the site fully static for public traffic.
- Keep content fully managed through EmDash.
- Prefer open-source, privacy-aware implementation choices and avoid unnecessary data collection.

## Non-Goals

- Public submissions.
- User accounts for public readers.
- Public governance flows.
- Appeals, conflict-of-interest workflows, or moderation queues.
- Initiative-level graph data.
- Organization, community, dataset, event, need, or tool entities as first-class graph nodes.
- Recommendations.
- Clustering.
- Matchmaking.
- Ecosystem analytics.
- Personalized feeds.
- Behavioral tracking or third-party surveillance by default.
- Multi-persona landing pages.

## Core User Journey

1. A reader lands on the homepage.
2. The first impression communicates TEMIS as editorial, technical, and network-aware.
3. The reader sees or interacts with a category graph.
4. The reader selects a category, theme, or visible connection.
5. The reader lands on a category page or article list.
6. The reader opens an article, including essays or tool announcements.
7. The reader can inspect the author/person page behind the article.
8. The reader subscribes or shares.

## Content Scope

V1 content types:

- Article.
- Person/author.
- Category/topic.
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

Public people pages should list authored articles and may later become connection points for the broader network graph. CMS users and public person records may be related, but they should not be assumed to be the same object unless the implementation explicitly supports that safely.

### Category/Topic

Purpose: power the V1 graph navigation and group related editorial content.

Expected fields:

- Name.
- Slug.
- Short description.
- Visual weight or priority.
- Related categories as unlabeled edges.
- Optional color/accent.
- SEO title.
- SEO description.

Category relationships should be editorially managed in V1. They are not inferred, scored, clustered, labeled, or recommended.

## Graph Navigation

The V1 graph is category-driven.

It should behave as:

- A homepage visual anchor.
- A navigation model.
- A signal of future network/federation ambition.
- A way to move from theme to theme and from theme to content.

It should not behave as:

- A canonical knowledge graph.
- An initiative database.
- A recommendation engine.
- An automatically clustered graph.

### Graph Requirements

- Render category/topic nodes.
- Show editorially configured unlabeled relationships between categories.
- Let users navigate from a node to category content.
- Support responsive desktop and mobile experiences.
- Degrade gracefully if there are few categories at launch.
- Avoid graph sprawl by allowing editorial priority/visibility controls.

## Visual And UX Direction

The interface should feel:

- Editorial.
- Data-like.
- Technical.
- Network-aware.
- Public and accessible.

The site should not feel:

- Like a SaaS landing page.
- Like a dashboard for logged-in users.
- Like a generic blog template.
- Like a full social network.

The homepage should make the graph/federation appetite visible in the first viewport, while still making it obvious that the primary activity is reading.

## Calls To Action

Primary CTAs:

- Subscribe.
- Share.

Secondary CTAs:

- Explore related content.
- Browse by category.

V1 does not need contact, submit, sign in, contribute, or fund flows unless later explicitly added.

## Open Source And Privacy Posture

TEMIS should be designed to become a very open-source and privacy-aware project.

V1 implementation expectations:

- Prefer open-source components and services.
- Prefer copyleft-compatible choices when practical and document licensing tradeoffs when not.
- Avoid tracking cookies by default.
- Avoid collecting personal data from passive readers unless a chosen subscribe or analytics tool requires it.
- Use privacy-preserving analytics if analytics are added.
- Make author/person data explicit, editable, and intentionally published rather than inferred from private CMS user data.
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
- Images are optimized at build time where practical.
- Publishing in EmDash triggers a Cloudflare Pages rebuild through a deploy hook.
- The public build should be compatible with a future public/open-source repository posture.

## Success Metrics

Primary launch metrics:

- Readers.
- Subscribers.
- Shares.
- Qualitative signal: people talking about TEMIS.

Metrics should be collected in a privacy-aware way. V1 should not require cross-site tracking or personalized reader profiles to measure success.

Operational metrics:

- Number of published essays/tool announcements.
- Number of categories with enough content to feel useful.
- Static build success rate.
- Time from publish in EmDash to public deployment.

## V1 Acceptance Criteria

- A public homepage introduces TEMIS and exposes graph-like category navigation.
- At least one essay-style article and one tool-announcement article can be published from EmDash and rendered statically.
- At least one person/author page can be published from EmDash and rendered statically.
- Articles can link to one or more public person/author pages.
- Category/topic nodes can be managed in EmDash.
- Category/topic edges are unlabeled in V1.
- Category/topic pages list related content.
- Articles include subscribe and share affordances.
- Published-only filtering works.
- Draft preview works from the CMS surface.
- Cloudflare Pages rebuild can be triggered from the CMS publish flow.
- The public site has no public submission or login requirement.
- The visual system clearly signals editorial/data-like/network direction.

## Open Questions Before Final PRD Approval

- What are the first 5-10 V1 categories/topics?
- What privacy-aware newsletter/subscription provider should the subscribe CTA use?
- What privacy-aware analytics approach, if any, is acceptable for V1?
- Which share surfaces should ship first beyond native share and copy link?
- Should CMS users be linkable to public person records, or should public people remain separate editorial content records?
- What is the minimum real content count required for launch after lorem ipsum scaffolding?
- What open-source license should govern the codebase, and should content use a separate license?
- What domain/name should replace TEMIS if the codename changes before launch?
