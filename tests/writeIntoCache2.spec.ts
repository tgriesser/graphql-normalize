import { execute } from 'graphql';
import { describe, expect, it } from 'vitest';
import { generateNormalizedOperation } from '../src/codegen/generateNormalizedOperation';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedMetadata } from '../src/codegen/generateNormalizedMetadata';
import { writeQueryIntoCache } from '../src/writeIntoCache2';

describe('writeIntoCache', () => {
  //
  it('builds a cache of values', async () => {
    const meta = generateNormalizedMetadata(schema, operation1Doc);
    const variableValues = {};
    const result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    });
    const { cache, additions, updates } = writeQueryIntoCache({
      meta,
      variableValues,
      operationResult: result,
    });

    expect(cache).toMatchSnapshot();
    expect({ additions, updates }).toMatchSnapshot();
  });
});
