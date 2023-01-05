## GraphQL Normalize

Schema driven normalized caching, geared for persisted queries

## Goals:

- Ensures values are kept in sync across objects
- Minimizes traversals on responses when normalizing
- Preserve object identity when possible, based on schema definition & normalization
- Ensure object identity is tracked automatically via query augmentation

## Non-Goals:

**Preventing fetches for unfetched queries.**

If we have not fetched data yet for a query, we do not want to
