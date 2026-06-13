# ADR-0009: Keep V1 Operations Low-Cost

Date: 2026-06-13  
Status: Accepted  
Scope: V1

## Context

TEMIS V1 should validate the editorial product without committing to expensive infrastructure or operational complexity.

## Decision

V1 implementation should keep recurring operating cost low by default.

The project should prefer static hosting, managed platform primitives, build-time generation, and simple operational workflows before adding services that create ongoing cost or maintenance burden.

## Consequences

- Static rendering remains the default for public traffic.
- Cloudflare-native services are preferred while they meet V1 needs.
- New paid services should have an explicit launch-critical reason.
- Cost-sensitive choices must not compromise privacy, security, or content portability.
