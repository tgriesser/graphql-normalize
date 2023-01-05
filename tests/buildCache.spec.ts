import { execute } from 'graphql';
import { describe, expect, it } from 'vitest';
import { generateNormalizedOperation } from '../src/generateNormalizedOperation';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedMetadata } from '../src/generateNormalizedMetadata';
import { buildCache } from '../src/buildCache';

describe('buildCache', () => {
  //
  it('builds a cache of values', async () => {
    const meta = generateNormalizedMetadata(schema, operation1Doc);
    const variableValues = {};
    const result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    });
    expect(buildCache({ meta, result, variableValues })).toMatchSnapshot();
  });
});
