# ADR-0004: Model V1 Content Around Articles, Tools, Topics, Tags, And People

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 is content-first. It needs enough structure to support editorial discovery, author pages, topic browsing, and graph-friendly tool references without creating a broad entity system.

## Decision

The V1 content model will center on:

- Articles.
- Tools.
- Topics.
- Tags.
- Public people.
- Site and navigation settings.

Articles may have a kind, such as essay or tool announcement. Tool announcements remain articles in V1, but tools are also first-class graphable records so articles, topics, tags, and people can connect to a durable tool object.

Tools do not require a top-level public menu item in V1. A tool page or tool index may be introduced when the editorial surface needs it, but the underlying tool record should exist from the beginning.

## Consequences

- Editorial work starts with a small, understandable schema.
- Tool announcements share the article reading flow unless a specific template is later justified, while tool records remain available for graph navigation and relationship modeling.
- Tool records can exist without being promoted in the public navigation.
- Tags support graph and filtering needs without turning every tag into a main navigation category.
- Public people records can support author pages and article attribution.
- Broader entity modeling is outside this ADR.
