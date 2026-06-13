# Open Questions

Status: Draft  
Date: 2026-06-13

These are the remaining V1 decisions. Answer with the question IDs when possible, for example: `Q3: topic list`, `Q5: approve first-party capture`.

## Answered

- Q1: Published content uses `CC-BY-SA-4.0`.
- Q2: Keep `TEMIS` as the public name for V1.
- Q4: No minimum real content count gates platform delivery. Platform V1 should support lorem ipsum/demo content and CMS-managed real content; editorial launch readiness is handled separately.
- Q5: Use a first-party EmDash subscription delivery plugin with D1 storage, email subscription, and optional Wikimedia user talk page delivery. No listmonk for V1. See [subscription delivery plugin PRD](./prd-subscription-plugin-v1.md).
- Q6: Metrics must stay server/platform-side only. No client-side analytics, tracking cookies, fingerprinting, or third-party reader analytics.
- Q7: Start with native share where supported, copy link everywhere, and `mailto:` email fallback. No platform-specific share buttons in V1.

## Launch-Critical

### Q3. What are the first 5-10 topics?

Why it matters: topics drive the homepage navigation, article grouping, and lorem ipsum scaffolding.

Recommended default: choose 5 broad topics first, then split later only after real content proves the need.

Answer needed: topic names plus one-sentence descriptions.

### Q6. Which server/platform metrics should be reported for V1?

Answer: all metrics must stay server/platform-side.

Accepted metric set:

- Public traffic: aggregate Cloudflare request count, bandwidth, cache status, status-code distribution, and top public paths if available from Cloudflare aggregate logs/API without user profiling.
- CMS health: Worker request count, success/error counts, invocation status, CPU time, wall time, subrequests, and request duration.
- Publishing: deploy-hook trigger count, build UUID/status, build success/failure, build duration, and publish-to-deploy time.
- Content operations: count of published articles, people, and topics from the generated snapshot.
- Subscription: confirmed subscriber total and new confirmed subscribers.
- Sharing: no per-reader tracking. Count only explicit first-party share actions if implemented as aggregate server-side counters.

Open detail: confirm whether aggregate top public paths and aggregate share-action counters are acceptable.

### Q7. Which share surfaces should ship first?

Answer: ship native share where supported, copy link everywhere, and `mailto:` email as the only named fallback. Do not add platform-specific share buttons in V1.

## Content And Editorial

### Q8. Should tool announcement articles use the same visual template as essays?

Why it matters: one template is faster and more coherent; a distinct template may better support tool metadata.

Recommended default: same template for V1, with optional tool-name and tool-URL fields.

Answer needed: same template, distinct template, or same template with a small tool callout.

### Q9. Should public people records stay separate from CMS user accounts?

Why it matters: separating them protects private admin data; linking them can reduce duplication later.

Recommended default: keep public people as separate editorial records in V1.

Answer needed: separate records, linkable records, or undecided.

### Q10. What should author/person pages prioritize?

Why it matters: this shapes fields, page layout, and editorial workflow.

Recommended default: portrait, short bio, role/title, links, topic interests, and authored articles.

Answer needed: rank biography, authored articles, external links, topic expertise, affiliation, and portrait.

### Q11. Should articles support publication-owned bylines as well as named people?

Why it matters: early content may be authored by a team, an organization, or one named person.

Recommended default: support named people plus an optional publication-owned byline string.

Answer needed: named people only, publication-owned bylines only, or both.

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

### Q16. Should the visual system start light-first, dark-first, or support both?

Why it matters: this affects typography, imagery, contrast, motion, and the first implementation pass.

Recommended default: dark-first editorial/data-like interface if the goal is cool and techy; add light mode later only if needed.

Answer needed: light-first, dark-first, or both.

### Q17. How much motion should the homepage use?

Why it matters: motion can make the topic navigation feel alive, but it can hurt performance and accessibility.

Recommended default: subtle motion only, with reduced-motion support.

Answer needed: none, subtle, expressive, or decide after prototype.

### Q18. How prominent should topic navigation be on the homepage?

Why it matters: it must signal the network/navigation appetite without hiding the reading journey.

Recommended default: first-viewport anchor, with article discovery visible immediately below.

Answer needed: dominant first-viewport element, balanced with editorial feed, or secondary module.

### Q19. What is the mobile interaction model for topic navigation?

Why it matters: dense node layouts rarely work unchanged on small screens.

Recommended default: simplified horizontal/stacked topic explorer on mobile, not a miniaturized desktop layout.

Answer needed: simplified explorer, scrollable canvas, list-first fallback, or decide after prototype.

### Q20. What placeholder visual language should be used before final art direction?

Why it matters: lorem ipsum content still needs stable layout and meaningful visual testing.

Recommended default: abstract editorial/data visuals generated or designed for TEMIS, not generic stock imagery.

Answer needed: abstract data visuals, typographic placeholders, generated editorial images, or no imagery until real content.

## Technical

### Q21. What URL structure should articles, topics, and people use?

Why it matters: URLs are hard to change after publication.

Recommended default: `/articles/{slug}/`, `/topics/{slug}/`, `/people/{slug}/`.

Answer needed: URL patterns for articles, topics, and people.

### Q22. What SEO defaults should be generated for missing metadata?

Why it matters: editors should not need to fill every SEO field before preview works.

Recommended default: title from record title, description from summary, share image from record image or site default.

Answer needed: fallback title, description, and share image rules.

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
