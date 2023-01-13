## GraphQL Normalize

Standalone, schema driven normalized caching, aimed at removing the need for the entire operation document and GraphQL `visit` utility functions when utilizing fully persisted queries.

Based on trimmed down, pre-computed "metadata" generated in a compilation layer, so you don't need to provide the entire schema client side to have all necessary data.

Lower level, intended to be wrapped by other libraries providing a better experience around fetching & persisting (coming soon)

### Install

```
npm install graphql-normalize
```

## API

```
import { graphqlNormalize } from 'graphql-normalize';

const {
  cache,
  added,
  modified,
  result
} = graphqlNormalize(config)
```

```ts
export interface SyncWithCacheOptions {
  // Shape of the generated metadata for the current operation
  // we're reading or writing
  meta: NormalizeMetaShape;
  // read = cache overwrites result
  // write = result overwrites cache
  action: 'read' | 'write';
  // Used to determine the args, directives, etc.
  variableValues: Record<string, any>;
  // The shape of the normalized field cache
  cache: Record<string, any>;
  // The result we're writing into the cache, required if
  // action = write
  operationResult?: FormattedExecutionResult;
  // The current result, used as the target object to mutate
  // Optional if we're looking to use the cache to fulfill the meta shape
  currentResult?: FormattedExecutionResult['data'];
  // Equality function, used to deal with scalars,
  // recommended to supply a function like lodash's isEqual
  // if the results contains object/array values as scalar
  isEqual?: (a: any, b: any) => boolean;
}
```

## Goals:

- Only the normalization layer, no other bells & whistles
- Ensures values are kept in sync across objects when possible
- Properly handles arguments & aliases in all situations
- Single traversal on response payload when normalizing & reifying
- Mutates the cache & payload, best used with [Immer](https://immerjs.github.io/immer/)

### Todo:

- [ ] Proper handling for `@defer` fields
- [ ] Storage/handling of GraphQL Errors in response
- [ ] throw MissingFieldError when we expect a field to exist
