import type { SerializedQueryCache } from '../types';

export function serverStateContainer() {
  const cache = {};
  return {
    addOperationResult() {},
    toJSON(): SerializedQueryCache {
      return {};
    },
  };
}
