import { execute } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { produce } from 'immer';

import { generateNormalizedOperation } from '../src/codegen/generateNormalizedOperation';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedMetadata } from '../src/codegen/generateNormalizedMetadata';
import { writeIntoCache } from '../src/writeIntoCache';
import { readQueryFromCache } from '../src/readQueryFromCache';
import type { NormalizeMetaShape } from '../src/metadataShapes';

describe('readQueryFromCache', () => {
  let cacheFields = {};
  let meta: NormalizeMetaShape;
  beforeEach(async () => {
    meta = generateNormalizedMetadata(schema, operation1Doc);
    const variableValues = {};
    const result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    });
    cacheFields = {};
    writeIntoCache(cacheFields, { meta, result, variableValues });
  });
  it('builds a cache of values', async () => {
    const readResult = readQueryFromCache({
      meta,
      cacheFields,
      variableValues: {},
    });

    expect(readResult).toMatchSnapshot();
  });

  it('does not mutate the data if it has not changed', async () => {
    const readResult = readQueryFromCache({
      meta,
      cacheFields,
      variableValues: {},
    });
    const initial = produce({}, () => readResult);
    const secondRead = produce(initial, (existing) => {
      return readQueryFromCache({
        meta,
        cacheFields,
        existing,
        variableValues: {},
      });
    });
    expect(secondRead).toEqual(initial);
  });
});
