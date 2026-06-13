# ADR-0013: Use Aexeo For V1 SEO/GEO Evaluation

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 needs consistent SEO and GEO guidance for articles, topics, and public people without building custom analysis tooling first.

The requested npm package is published as `@aeptus/aexeo-emdash`.

## Decision

V1 will use `@aeptus/aexeo-emdash` as the EmDash SEO/GEO evaluation plugin.

The public site should still render normal static metadata from content fields. Aexeo is used to help editors evaluate and improve content metadata and structure inside the CMS workflow.

## Consequences

- SEO/GEO checks live close to editorial authoring.
- The public Astro site remains static and does not need runtime SEO tooling.
- Implementation must verify compatibility with the repo's current EmDash version before adding the dependency.
- If Aexeo cannot be integrated cleanly, the fallback is explicit SEO metadata fields plus static rendering.
