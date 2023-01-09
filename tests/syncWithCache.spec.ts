import { execute } from 'graphql';
import { describe, expect, it } from 'vitest';
import _ from 'lodash';

import { generateNormalizedOperation } from '../src/codegen/generateNormalizedOperation';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedMetadata } from '../src/codegen/generateNormalizedMetadata';
import { syncWithCache } from '../src/syncWithCache';

describe('syncWithCache', () => {
  //
  it('syncs the query result with the cache', async () => {
    const meta = generateNormalizedMetadata(schema, operation1Doc);
    const variableValues = {};
    const result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    });
    const cache = {
      operations: {},
      fields: {},
    } as const;

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
});
