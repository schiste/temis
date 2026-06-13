# ADR-0008: Prefer Open-Source And Privacy-Aware Defaults

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS should be built with a strong open-source and privacy-aware posture from the start.

## Decision

V1 implementation should prefer open-source components, privacy-preserving services, and minimal data collection.

V1 code should be licensed as `MIT OR Apache-2.0`.

V1 public pages must not use client-side reader tracking, tracking cookies, fingerprinting, or third-party analytics. Metrics should come from server/platform operational signals and explicit user actions.

When a proprietary service is selected, document the tradeoff before depending on it.

## Consequences

- Service and library choices should consider licensing and data collection early.
- Passive readers should not be tracked.
- Subscription and sharing tools must be reviewed for privacy impact before adoption.
- Content licensing remains a separate decision.
