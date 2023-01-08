import { describe, expect, it } from 'vitest';
import { copyList } from '../src/copyList';

describe('copyList', () => {
  it('copies list from source to destination', () => {
    const source = [
      [['a', 'b'], ['c']],
      ['d', ['e', 'f']],
    ];
    const destination: any[] = [];
    const result = copyList({
      source,
      target: destination,
      depth: 3,
      onValue: (a, b) => b,
      isEqual: (a, b) => a === b,
    });
    expect(result.modified).toEqual(true);
    expect(result.list).toMatchSnapshot();
  });

  it('doesnt mutate the list if nothing has changed', () => {
    const source = [
      [['a', 'b'], ['c']],
      ['d', ['e', 'f']],
    ];
    const destination: any[] = [
      [['a', 'b'], ['c']],
      ['d', ['e', 'f']],
    ];
    const result = copyList({
      source,
      target: destination,
      depth: 3,
      onValue: (a, b) => b,
      isEqual: (a, b) => a === b,
    });
    expect(result.modified).toEqual(false);
    expect(result.list).toEqual(destination);
  });
});
