import { describe, expect, it } from 'vitest';
import { schema } from './fixtures/schema';
import { generateNormalizedOperation } from '../src/generateNormalizedOperation';
import { printAddedFields } from './utils/printAddedFields';
import { operation1Doc } from './fixtures/ops';

describe('generateNormalizedOperation', () => {
  it('adds the necessary fields to properly normalize', () => {
    const changed = generateNormalizedOperation(schema, operation1Doc);
    expect(printAddedFields(operation1Doc, changed)).toMatchSnapshot();
  });

  //
});
