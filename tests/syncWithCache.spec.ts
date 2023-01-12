import { ExecutionResult, execute } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import _ from 'lodash';

import { generateNormalizedOperation } from '../src/codegen/generateNormalizedOperation';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedMetadata } from '../src/codegen/generateNormalizedMetadata';
import { syncWithCache } from '../src/syncWithCache';
import type { NormalizeMetaShape } from '../src/metadataShapes';
import type { CacheShape } from '../src/cache';
import produce, { enablePatches, produceWithPatches } from 'immer';

enablePatches();

describe('syncWithCache', () => {
  let meta: NormalizeMetaShape;
  let variableValues = {};
  let cache: CacheShape;
  let result: ExecutionResult;
  beforeEach(async () => {
    meta = generateNormalizedMetadata(schema, operation1Doc);
    variableValues = {};
    result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    });
    cache = {
      operations: {},
      fields: {},
    } as const;
  });
  it('syncs the query result with the cache', async () => {
    const obj = syncWithCache({
      action: 'write',
      meta,
      variableValues,
      operationResult: result.data,
      cache,
      isEqual: _.isEqual,
      //
    });

    expect(cache).toMatchSnapshot();
    expect(obj).toMatchSnapshot();

    const obj2 = syncWithCache({
      action: 'write',
      meta,
      variableValues,
      operationResult: result.data,
      currentResult: obj.result,
      cache,
      isEqual: _.isEqual,
    });

    expect({
      changed: obj2.changed,
      added: obj2.added,
      updated: obj2.updated,
    }).toMatchInlineSnapshot(`
      {
        "added": 0,
        "changed": 0,
        "updated": 0,
      }
    `);
  });

  it('writes additional values into the store when the variables are changed', async () => {
    const { result: currentResult } = syncWithCache({
      action: 'write',
      meta,
      variableValues,
      operationResult: result.data,
      cache,
      isEqual: _.isEqual,
      //
    });

    const variableValues2 = { hasNode: true, nodeId: 'VXNlcjox' };

    const result2 = await execute({
      schema,
      variableValues: variableValues2,
      contextValue: {},
      document: generateNormalizedOperation(schema, operation1Doc),
    });

    const [, patches] = produceWithPatches({ cache, currentResult }, ({ cache, currentResult }) => {
      const sync2 = syncWithCache({
        action: 'write',
        meta,
        variableValues: variableValues2,
        currentResult,
        operationResult: result2.data,
        cache,
        isEqual: _.isEqual,
      });

      // Only added a single item to the cache, since we already have this object.
      expect(sync2.added).toEqual(1);
      expect(sync2.updated).toEqual(0);
    });

    expect(patches).toMatchSnapshot();
  });
});
