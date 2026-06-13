# ADR-0004: Model V1 Content Around Articles, Topics, And People

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 is content-first. It needs enough structure to support editorial discovery, author pages, and topic browsing without creating a broad entity system.

## Decision

The V1 content model will center on:

- Articles.
- Topics.
- Public people.
- Site and navigation settings.

Articles may have a kind, such as essay or tool announcement. Tool announcements remain articles in V1.

## Consequences

- Editorial work starts with a small, understandable schema.
- Tool announcements share the article reading flow unless a specific template is later justified.
- Public people records can support author pages and article attribution.
- Broader entity modeling is outside this ADR.
