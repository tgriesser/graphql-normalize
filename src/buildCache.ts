import type { FormattedExecutionResult } from 'graphql';
import { walk } from './walk';
import type { NormalizedDoc } from './extensionShape';

/**
 * Write values into the cache, given the values, the existing cache, and the
 */
export function buildCache(result: FormattedExecutionResult, normalizingMeta: NormalizedDoc) {
  let pathPrefix = '';
  let currentKey;
  let currentKeyStack = [];
  let currentWriteKey = undefined;
  let currentWriteKeyStack = [];

  const selectionKeys = Object.keys(normalizingMeta.selectionSet);

  function walkUntilList(val: any) {
    walk(val, {
      enter(node) {
        const key = node.path.join('.');
        const metaDef = normalizingMeta.selectionSet[key];
        console.log(key, metaDef);
        if (metaDef.list) {
          return false;
        }
      },
      leave() {
        //
      },
    });
  }

  walkUntilList(result);
}
