# ADR-0008: Prefer Open-Source And Privacy-Aware Defaults

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS should be built with a strong open-source and privacy-aware posture from the start.

## Decision

V1 implementation should prefer open-source components, privacy-preserving services, and minimal data collection.

When practical, choose copyleft-compatible options. When a non-copyleft-compatible or proprietary service is selected, document the tradeoff before depending on it.

## Consequences

- Service and library choices should consider licensing and data collection early.
- Passive readers should not be tracked by default.
- Analytics, subscriptions, and sharing tools must be reviewed for privacy impact before adoption.
- Licensing decisions for code and content should be explicit before the repository is made public.
