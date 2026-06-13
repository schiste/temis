# ADR-0001: Use Static Astro For The Public Site

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 is a public editorial website. Readers should be able to browse and read content quickly without depending on request-time CMS availability.

## Decision

The public TEMIS site will be generated with Astro as a static site.

The public site will render only published content during the build. Draft and editorial preview behavior belongs outside the public static build.

## Consequences

- Public pages can be hosted on static infrastructure.
- Public traffic does not need direct access to the CMS database or media storage APIs.
- Publishing requires a rebuild before public pages change.
- Preview behavior must be implemented through the CMS or a dedicated preview surface.
