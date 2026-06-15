# TEMIS V1 Tool Model

Status: Draft  
Date: 2026-06-15  
Scope: V1

## Purpose

Tools are first-class editorial records in TEMIS V1.

A tool record represents a durable public object: software, prototype, workflow,
technical resource, or other practical artifact that readers may want to inspect
outside the narrative flow of an article.

Tool announcements remain articles. A tool announcement explains context,
argument, launch, or usage. A tool record stores the stable reference object
that can connect to articles, people, topics, tags, and graph navigation.

## Publication Rule

A published tool record has a public page.

`graph_visible` controls graph appearance only. It does not control whether the
tool page exists.

## Required Fields

- `title`: public tool name.
- `slug`: stable public URL slug.
- `summary`: short public summary.
- `description`: longer editorial description.
- `license`: required license identifier or label.
- `privacy_note`: required plain-language privacy/data handling note.
- `technical_maturity`: required technical status.
- `editorial_confidence`: required editorial confidence level.

## Recommended Link Fields

- `tool_url`: canonical website or live tool URL.
- `repository_url`: source repository URL.
- `documentation_url`: documentation URL.

At least one useful external link should be present for a public tool record.
Open-source tools should include a repository URL whenever possible.

## Technical Maturity

Technical maturity describes the tool's development state, not TEMIS editorial
endorsement.

Recommended V1 values:

- `Prototype`
- `Experimental`
- `Active`
- `Stable`
- `Archived`

## Editorial Confidence

Editorial confidence describes how much TEMIS can stand behind the record as a
useful public reference.

Recommended V1 values:

- `Observed`
- `Promising`
- `Used by TEMIS`
- `Recommended`
- `Needs review`

## People Relationships

Tools may link to public people records with a role.

Recommended V1 roles:

- `Creator`
- `Maintainer`
- `Contributor`
- `Researcher`
- `Sponsor`
- `Reviewer`

Public people records and CMS users remain separate concepts. A tool-person link
points to a public person record.

## Graph Behavior

Tool nodes are first-class graph nodes.

Tool nodes may connect to:

- Articles that announce, document, evaluate, or contextualize the tool.
- Public people associated with the tool.
- Topics and tags.

Graph edges remain visually unlabeled in V1, even when internal relationship
types or tool-person roles exist.

## Public Page Requirements

A V1 tool page should show:

- Tool name and summary.
- Website, repository, and documentation links when present.
- License.
- Privacy note.
- Technical maturity.
- Editorial confidence.
- Description.
- Related articles and people when available.

The page should feel like a technical commons record, not a SaaS marketing page.
