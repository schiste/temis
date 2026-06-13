# Open Questions

Status: Draft  
Date: 2026-06-13

These are the remaining V1 decisions. Answer with the question IDs when possible, for example: `Q1: CC-BY-4.0`, `Q2: temis.org`.

## Launch-Critical

### Q1. Which Creative Commons 4.0 variant should published content use?

Why it matters: the exact license must appear in the public footer, content metadata, and repo docs.

Recommended default: `CC-BY-4.0` if attribution is enough; `CC-BY-SA-4.0` if content reuse should stay share-alike.

Answer needed: exact SPDX license identifier, for example `CC-BY-4.0` or `CC-BY-SA-4.0`.

### Q2. What final public name and domain should replace the TEMIS codename, if any?

Why it matters: naming affects URLs, Cloudflare routes, metadata, share images, and copy.

Recommended default: keep `TEMIS` for V1 until a final name is ready.

Answer needed: public name, primary domain, and whether the `temis-*` Cloudflare resource names should stay as internal codenames.

### Q3. What are the first 5-10 topics?

Why it matters: topics drive the homepage navigation, article grouping, and lorem ipsum scaffolding.

Recommended default: choose 5 broad topics first, then split later only after real content proves the need.

Answer needed: topic names plus one-sentence descriptions.

### Q4. What is the minimum real content count for launch?

Why it matters: the homepage, topic pages, author pages, and related-content surfaces need enough real content to feel intentional.

Recommended default: 6-8 articles, at least 3 public people, and at least 5 topics.

Answer needed: minimum article count, minimum person count, and whether launch requires both essay and tool-announcement examples.

### Q5. Which newsletter or subscription provider should V1 use?

Why it matters: subscribe is a primary CTA, and the provider must not undermine the no-tracking posture.

Recommended default: start with the least invasive provider that supports export, double opt-in, and no client-side tracking.

Answer needed: provider name, whether embeds are allowed, and what data is collected at signup.

### Q6. Which server/platform metrics should be reported for V1?

Why it matters: V1 has no client-side analytics, tracking cookies, fingerprinting, or third-party analytics.

Recommended default: Cloudflare request counts, deploy/build success, publish-to-deploy time, subscriber count, and share-button click counts only if measured without reader tracking.

Answer needed: exact metrics to report and where they should be reviewed.

### Q7. Which share surfaces should ship first?

Why it matters: share is a primary CTA, but each surface has privacy and UX tradeoffs.

Recommended default: native share where available, copy link everywhere, and email as the only named fallback.

Answer needed: choose from native share, copy link, email, LinkedIn, Bluesky, X, Mastodon, or none beyond copy link.

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
