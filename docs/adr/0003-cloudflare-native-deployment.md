# ADR-0003: Use Cloudflare-Native Deployment And Storage

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS should start with a deployment model that matches the existing Cloudflare account and keeps platform operations simple.

## Decision

TEMIS V1 will use Cloudflare Pages for the public static site, Cloudflare Workers for the CMS and preview surface, D1 for CMS data, and R2 for media storage.

Publishing or unpublishing content in the CMS should trigger a Cloudflare Pages rebuild through a deploy hook.

## Consequences

- Deployment remains platform-native for V1.
- Public hosting, CMS runtime, database, and object storage all live in one provider.
- The site needs clear environment variables and bindings for Pages, Workers, D1, and R2.
- Any future provider change should be captured in a new ADR.
