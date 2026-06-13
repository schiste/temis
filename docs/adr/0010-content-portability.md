# ADR-0010: Preserve Content Portability

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS should avoid locking public content into one runtime, vendor, or private export path. Static generation from CMS-managed content already creates a useful boundary between authoring and serving.

## Decision

V1 content should remain portable through documented schemas, published-content snapshots, and repository-tracked rendering code.

The public site should consume build-time content data rather than depending on request-time CMS access.

## Consequences

- Public rendering can be tested from snapshots.
- Content export and backup paths are easier to reason about.
- Future migrations are less risky if content records stay structured and documented.
- Any CMS-specific implementation detail that leaks into public routes should be treated as coupling to review.
