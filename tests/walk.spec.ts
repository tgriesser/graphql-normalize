import { describe, it } from 'vitest';
import { walk } from '../src/walk';
import { execute } from 'graphql';
import { schema } from './fixtures/schema';
import { operation1Doc } from './fixtures/ops';
import { generateNormalizedOperation } from '../src/generateNormalizedOperation';

describe('visitor', () => {
  it('should visit a JS object', async () => {
    const data = await execute({
      schema,
      document: generateNormalizedOperation(schema, operation1Doc),
    });

    // console.log(JSON.stringify(data));
    // walk(data, {
    //   enter(path, val) {
    //     // console.log('enter', path, val);
    //   },
    //   leave(path, val) {
    //     // console.log('leave', path, val);
    //   },
    // });
  });
});
