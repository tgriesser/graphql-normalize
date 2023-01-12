## GraphQL Normalize

Standalone, schema driven normalized caching, optimized specifically for persisted queries.
Based on trimmed down, pre-computed "metadata" supplied in a pre-optimization layer, so you don't need to provide the entire schema client side to have all necessary data

## Goals:

- Ensures values are kept in sync across objects
- Minimizes traversals on responses when normalizing
- Preserve object identity when possible, based on schema definition & normalization
- Ensure object identity is tracked automatically via query augmentation

### Todo:

- Proper handling for `@defer` fields
- Storage/handling of GraphQL Errors in response
