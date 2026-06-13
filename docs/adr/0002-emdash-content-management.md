# ADR-0002: Use EmDash As The Content Management System

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS needs editorial content management without building a custom admin system first. Editors need draft, publish, media, and authentication flows.

## Decision

TEMIS V1 will use EmDash for content authoring, editing, publishing, media management, preview, and admin authentication.

## Consequences

- The project can focus V1 effort on the public site, content model, and publishing workflow.
- CMS authentication uses EmDash capabilities instead of a custom auth implementation.
- Content schemas must be represented in a way EmDash can manage cleanly.
- Public pages should consume a published-content snapshot rather than querying EmDash at request time.
