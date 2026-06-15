# Open Questions

Status: Draft  
Date: 2026-06-13

These are the remaining V1 decisions. Answer with the question IDs when possible, for example: `Q3: topic list`, `Q5: approve first-party capture`.

## Answered

- Q1: Published content uses `CC-BY-SA-4.0`.
- Q2: Keep `TEMIS` as the public name for V1.
- Q4: No minimum real content count gates platform delivery. Platform V1 should support lorem ipsum/demo content and CMS-managed real content; editorial launch readiness is handled separately.
- Q5: Move the first-party EmDash subscription delivery plugin to V1.5. V1 may include only a placeholder subscribe CTA. See [V1.5 subscription delivery plugin PRD](./prd-v1-5-subscription-plugin.md).
- Q6: Metrics must stay server/platform-side only. No client-side analytics, tracking cookies, fingerprinting, or third-party reader analytics.
- Q7: Start with native share where supported, copy link everywhere, and `mailto:` email fallback. No platform-specific share buttons in V1.
- Q8: Tool announcement articles use the same article template for V1.
- Q9: Public people are first-class editorial records. Some public people may link to CMS users when safe, but public people and CMS users are not the same object by default.
- Q11: Articles support named people plus an optional team/publication byline.
- Q16: V1 should support both dark and light themes.
- Q18: Graph-based content navigation should be a homepage anchor.
- Q22: Use `@aeptus/aexeo-emdash` for V1 SEO/GEO evaluation in the EmDash workflow.
- Q23: Published tools have public pages; `graph_visible` controls graph appearance only. Public tool records require license and privacy notes, track technical maturity and editorial confidence separately, and can link to public people with roles.

## Launch-Critical

### Q3. What are the first 5-10 topics?

Why it matters: topics drive the homepage navigation, article grouping, and lorem ipsum scaffolding.

Current starter topics:

- News.
- Initiatives.
- Essays.

Answer needed: one-sentence descriptions for each starter topic and any additional V1 topics.

## Content And Editorial

### Q10. What should author/person pages prioritize?

Why it matters: this shapes fields, page layout, and editorial workflow.

Recommended default: portrait, short bio, role/title, links, topic interests, and authored articles.

Answer needed: rank biography, authored articles, external links, topic expertise, affiliation, and portrait.

### Q12. What editorial quality rules should essays follow?

Why it matters: rules prevent placeholder writing from becoming launch content and keep the site coherent.

Recommended default: clear thesis, strong summary, named author, topic assignments, no generic filler, and explicit publication date.

Answer needed: required essay checklist.

### Q13. What editorial quality rules should tool announcement articles follow?

Why it matters: tool announcements should read like editorial context, not generic product marketing.

Recommended default: explain the tool, why it matters, who it helps, how it connects to topics, and where to find it.

Answer needed: required tool-announcement checklist.

### Q14. Should topic pages be short landing pages or simple article lists?

Why it matters: landing pages require more editorial work; lists are faster but less distinctive.

Recommended default: short landing pages with a description, related topics, and article list.

Answer needed: simple lists, short landing pages, or rich editorial pages.

### Q15. How should related articles be selected in V1?

Why it matters: related content can be manual, topic-based, or omitted until enough content exists.

Recommended default: topic-based related articles with optional manual overrides later.

Answer needed: topic-based, manual, both, or none for launch.

## Design And UX

### Q17. How much motion should the homepage use?

Why it matters: motion can make graph navigation feel alive, but it can hurt performance and accessibility.

Recommended default: subtle motion only, with reduced-motion support.

Answer needed: none, subtle, expressive, or decide after prototype.

### Q19. What is the mobile interaction model for graph navigation?

Why it matters: dense node layouts rarely work unchanged on small screens.

Recommended default: simplified horizontal/stacked topic explorer on mobile, not a miniaturized desktop layout.

Answer needed: simplified explorer, scrollable canvas, list-first fallback, or decide after prototype.

### Q19A. Should V1 use a custom graph renderer or a graph library?

Why it matters: a custom SVG/HTML renderer is easier to control and make accessible; a library may speed up interaction but can add bundle and accessibility cost.

Recommended default: custom deterministic SVG/HTML renderer first, interactive enhancement second.

Answer needed: custom renderer, lightweight library, or decide after prototype.

### Q20. What placeholder visual language should be used before final art direction?

Why it matters: lorem ipsum content still needs stable layout and meaningful visual testing.

Recommended default: abstract editorial/data visuals generated or designed for TEMIS, not generic stock imagery.

Answer needed: abstract data visuals, typographic placeholders, generated editorial images, or no imagery until real content.

## Technical

### Q21. What URL structure should articles, topics, and people use?

Why it matters: URLs are hard to change after publication.

Recommended default: `/articles/{slug}/`, `/topics/{slug}/`, `/people/{slug}/`.

Answer needed: URL patterns for articles, topics, and people.

### Q23. What media sizes and aspect ratios should editors use?

Why it matters: image rules prevent layout drift and expensive media cleanup later.

Recommended default: article hero 16:9, person portrait 1:1, share image 1200x630.

Answer needed: required aspect ratios and minimum dimensions.

### Q24. What must CMS preview prove before launch?

Why it matters: preview is the editor safety net for draft content.

Recommended default: draft article preview, draft person preview, draft topic preview, unpublished content excluded from public build.

Answer needed: preview acceptance checklist.

### Q25. How should publish/build failures be surfaced to editors?

Why it matters: publish-triggered rebuilds can fail, and editors need to know when public content did not update.

Recommended default: start with Cloudflare build notifications plus a documented manual check; add CMS-visible status later if needed.

Answer needed: notification channel and minimum failure-response workflow.

### Q26. How should lorem ipsum be replaced by CMS-managed content before launch?

Why it matters: the handoff from scaffolding to real content should be explicit.

Recommended default: seed lorem ipsum for local development only, then launch from EmDash-managed published content.

Answer needed: keep local seed content, CMS-only launch content, or both with a clear cutoff.
