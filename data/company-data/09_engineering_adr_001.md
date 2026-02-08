# ADR-001: Use TypeScript Monorepo

Date: 2024-11-12

## Status

Accepted

## Context

Engineering projects were fragmented across several JavaScript repos. Lack of types caused runtime errors in production.

## Decision

We will migrate all frontend and backend packages into a unified **pnpm** monorepo using **TypeScript** strict mode.

## Consequences

1. Short-term dev slowdown due to migration.
2. Long-term gain: shared types, easier refactors, reduced bugs.

