import { describe, expect, it } from 'vitest';
import { generateNormalizedMetadata } from '../src/generateNormalizedMetadata';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';

describe('generateNormalizedMetadata', () => {
  //
  it('should generate the necessary metadata', () => {
    expect(generateNormalizedMetadata(schema, operation1Doc)).toMatchSnapshot();
  });

  //
});
