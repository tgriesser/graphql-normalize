## GraphQL Normalize

Standalone, schema driven normalized caching, geared specifically for persisted queries

## Goals:

- Ensures values are kept in sync across objects
- Minimizes traversals on responses when normalizing
- Preserve object identity when possible, based on schema definition & normalization
- Ensure object identity is tracked automatically via query augmentation

## Non-Goals:

- Preventing fetches for fully unfetched queries

### Algorithm
