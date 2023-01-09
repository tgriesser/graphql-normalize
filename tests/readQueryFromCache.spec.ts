import { execute } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { produce } from 'immer';

import { generateNormalizedOperation } from '../src/codegen/generateNormalizedOperation';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedMetadata } from '../src/codegen/generateNormalizedMetadata';
import { readQueryFromCache } from '../src/readQueryFromCache';
import type { NormalizeMetaShape } from '../src/metadataShapes';
import { syncWithCache } from '../src/syncWithCache';

describe('readQueryFromCache', () => {
  let cache = {
    operations: {},
    fields: {},
  };
  let meta: NormalizeMetaShape;
  beforeEach(async () => {
    meta = generateNormalizedMetadata(schema, operation1Doc);
    const variableValues = {};
    const result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    });
    cache = {
      operations: {},
      fields: {},
    };
    syncWithCache({
      action: 'write',
      meta,
      operationResult: result.data,
      variableValues,
      cache,
    });
  });

  it('builds a cache of values', async () => {
    const readResult = readQueryFromCache({
      meta,
      cacheFields: cache.fields,
      variableValues: {},
    });
    expect(readResult).toMatchSnapshot();
  });

  it('does not mutate the data if it has not changed', async () => {
    const readResult = readQueryFromCache({
      meta,
      cacheFields: cache.fields,
      variableValues: {},
    });
    const initial = produce({}, () => readResult);
    const secondRead = produce(initial, (existing) => {
      return readQueryFromCache({
        meta,
        cacheFields: cache.fields,
        existing,
        variableValues: {},
      });
    });
    expect(secondRead).toEqual(initial);
  });
});
