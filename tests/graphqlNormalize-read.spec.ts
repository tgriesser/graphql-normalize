import { execute } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { produce } from 'immer';

import { generateNormalizedOperation, generateNormalizedMetadata } from '../src/codegen';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import type { NormalizeMetaShape } from '../src/metadataShapes';
import { graphqlNormalize } from '../src/graphqlNormalize';

describe('graphqlNormalize: read', () => {
  let cache = {};
  let meta: NormalizeMetaShape;
  beforeEach(async () => {
    meta = generateNormalizedMetadata(schema, operation1Doc);
    const variableValues = {};
    cache = {};
    graphqlNormalize({
      action: 'write',
      meta,
      operationResult: await execute({
        schema,
        variableValues,
        document: generateNormalizedOperation(schema, operation1Doc),
      }),
      variableValues,
      cache,
    });
  });

  it('builds a cache of values', async () => {
    const { result } = graphqlNormalize({
      action: 'read',
      meta: produce(meta, () => {}), // ensures meta isn't mutated
      cache: produce(cache, () => {}), // ensures cache isn't mutated
      variableValues: {},
    });
    expect(result).toMatchSnapshot();
  });

  it('does not mutate the data if it has not changed', async () => {
    const { result: readResult } = graphqlNormalize({
      action: 'read',
      meta,
      cache,
      variableValues: {},
    });
    const initial = produce({}, () => readResult);
    const secondRead = produce(readResult, (existing) => {
      graphqlNormalize({
        action: 'read',
        meta,
        cache,
        currentResult: existing,
        variableValues: {},
      });
    });
    expect(secondRead).toEqual(initial);
  });
});
