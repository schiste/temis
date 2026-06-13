# ADR-0007: Make Public People Pages First-Class

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS articles need clear attribution, and readers should be able to discover the people behind published work. Public author pages are part of the product experience, not incidental metadata.

## Decision

Public people records will be first-class V1 content items.

Articles can reference one or more public people records. Public people pages should be statically rendered and list relevant published articles.

CMS user accounts and public people records may be linked later if the implementation supports it safely, but they are not the same object by default.

## Consequences

- Author pages can be designed and optimized as public pages.
- Public person data is intentionally published editorial content.
- Private CMS account details do not need to leak into the public site.
- Attribution can support individual authors, contributors, and publication-owned bylines.
