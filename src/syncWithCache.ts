import type { FieldDef, FieldMeta, NormalizeMetaShape } from './metadataShapes';
import type { FormattedExecutionResult } from 'graphql';
import type { CacheShape } from './cache';
import { __typename } from './constants';
import { printArgs } from './printArgs';
import { makeCacheKey } from './makeCacheKey';

type Path = Array<string | number>;

export interface SyncWithCacheOptions {
  // read = cache overwrites result
  // write = result overwrites cache
  action: 'read' | 'write';
  // Used to determine the args, directives, etc.
  variableValues: Record<string, any>;
  // Shape of the metadata for the current operation
  // we're reading or writing
  meta: NormalizeMetaShape;
  // The shape of the normalized cache
  cache: CacheShape;
  // The result we're writing into
  operationResult: FormattedExecutionResult['data'];
  // The current result, used as the target object to mutate,
  // or a new value if we're initially syncing
  currentResult?: FormattedExecutionResult['data'];
  // Equality function, used to deal with scalars
  isEqual?: (a: any, b: any) => boolean;
}

export interface WriteFieldConfig {
  cacheVal: any;
  targetVal: any;
  resultVal: any;
}

export interface WriteListFieldConfig extends WriteFieldConfig {
  atIndex: number;
}

export interface SyncTraverseOptions extends WriteFieldConfig {
  fields: FieldDef[];
}

export interface CopyListConfig {
  cacheVal: Array<any>;
  targetVal: Array<any>;
  resultVal: Array<any>;
  depth: number;
  currentDepth?: number;
}

function defaultIsEqual(a: any, b: any) {
  return a === b;
}

const ensure = (obj: any, path: Path, fallback: any) => {
  let source = obj;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const hasNext = i < path.length - 1;
    if (hasNext) {
      if (source[key] === undefined) {
        source[key] = typeof key === 'number' ? [] : {};
      }
      source = source[key];
    } else if (source[key] === undefined) {
      source[key] = fallback;
      return fallback;
    } else {
      return source[key];
    }
  }
};

const get = (obj: any, key: string | number) => {
  return obj[key];
};

const getIn = (obj: any, path: Path) => {
  let source = obj;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (source[key] == null) {
      return source[key];
    }
    source = source[key];
  }
  return source;
};

export function syncWithCache(options: SyncWithCacheOptions) {
  const {
    action,
    variableValues,
    cache,
    operationResult,
    currentResult = {},
    isEqual = defaultIsEqual,
    meta,
  } = options;

  let added = 0;
  let updated = 0;
  let changed = 0;
  const isWrite = action === 'write';

  const set = (obj: any, key: string | number, val: any) => {
    if (!isEqual(obj[key], val)) {
      obj[key] = val;
    }
  };

  const setIn = (obj: any, path: Path, value: any) => {
    let source = obj;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const hasNext = i < path.length - 1;
      if (hasNext) {
        if (source[key] === undefined) {
          source[key] = typeof key === 'number' ? [] : {};
        }
        source = source[key];
      } else if (!isEqual(source[key], value)) {
        if (source[key] === undefined) {
          added++;
        } else {
          updated++;
        }
        changed++;
        source[key] = value;
      }
    }
  };

  const handleField = (field: FieldMeta, options: SyncTraverseOptions) => {
    const { cacheVal, resultVal, targetVal } = options;
    const resultName = field.alias ?? field.name;
    const argsKey = printArgs(field.args, meta, variableValues);

    // If we don't have a value, set that and skip field
    if (resultVal[resultName] === null) {
      if (isWrite) {
        setIn(cacheVal, [field.name, argsKey], null);
      }
      set(targetVal, resultName, null);
      return;
    }

    const traverseList = (config: CopyListConfig) => {
      const { resultVal, targetVal, cacheVal, depth, currentDepth = 1 } = config;
      if (resultVal.length < targetVal.length) {
        targetVal.length = resultVal.length;
      }
      if (isWrite && resultVal.length < cacheVal.length) {
        cacheVal.length = resultVal.length;
      }

      for (let i = 0; i < resultVal.length; i++) {
        if (currentDepth < depth && resultVal[i] !== null) {
          if (isWrite) {
            ensure(cacheVal, [i], []);
          }
          ensure(targetVal, [i], []);
          traverseList({
            depth,
            resultVal: resultVal[i],
            targetVal: targetVal[i],
            cacheVal: cacheVal[i],
            currentDepth: currentDepth + 1,
          });
        } else {
          writeListField({
            cacheVal,
            targetVal,
            resultVal,
            atIndex: i,
          });
        }
      }
    };

    const writeFieldMeta = (val: any) => {
      const { possible, cacheKey, fields } = field;
      const typename = val?.[__typename];
      if (possible && val) {
        const possibleInfo = possible[typename];
        if (possibleInfo) {
          return {
            typename,
            fields: possibleInfo.fields.concat(fields ?? []),
            cacheKeyVal: possibleInfo.cacheKey ? makeCacheKey(possibleInfo.cacheKey, val) : undefined,
          };
        }
      }
      return {
        typename,
        fields: fields,
        cacheKeyVal: cacheKey ? makeCacheKey(cacheKey, val) : undefined,
      };
    };

    const writeListField = (writeConfig: WriteListFieldConfig) => {
      const { cacheVal, resultVal, targetVal, atIndex } = writeConfig;
      const { cacheKeyVal, fields, typename } = writeFieldMeta(resultVal[atIndex]);
      if (isWrite) {
        if (cacheKeyVal) {
          set(cacheVal, atIndex, { $ref: cacheKeyVal });
          setIn(cache.fields, [cacheKeyVal, __typename], typename);
        } else {
          set(cacheVal, atIndex, resultVal[atIndex]);
        }
      }
      if (fields) {
        ensure(targetVal, [atIndex], {});
        traverseFields({
          fields,
          targetVal: ensure(targetVal, [atIndex], {}),
          resultVal: resultVal[atIndex],
          cacheVal: cacheKeyVal ? ensure(cache.fields, [cacheKeyVal], {}) : ensure(cacheVal, [atIndex], {}),
        });
      } else {
        set(targetVal, atIndex, resultVal[atIndex]);
      }
    };

    const writeField = (writeConfig: WriteFieldConfig) => {
      const { cacheVal, resultVal, targetVal } = writeConfig;
      const { cacheKeyVal, fields, typename } = writeFieldMeta(resultVal[resultName]);
      if (isWrite) {
        if (cacheKeyVal) {
          setIn(cacheVal, [field.name, argsKey], { $ref: cacheKeyVal });
          setIn(cache.fields, [cacheKeyVal, __typename], typename);
        }
      }
      if (fields) {
        traverseFields({
          fields: fields,
          cacheVal: cacheKeyVal ? getIn(cache.fields, [cacheKeyVal]) : ensure(cacheVal, [field.name, argsKey], {}),
          targetVal: ensure(targetVal, [resultName], {}),
          resultVal: resultVal[resultName],
        });
      } else {
        if (isWrite) {
          setIn(cacheVal, [field.name, argsKey], resultVal[resultName]);
        }
        setIn(targetVal, [resultName], resultVal[resultName]);
      }
    };

    if (field.list) {
      // If we're writing, we're setting the cache, so we use the cache as the
      // target val while also setting the value in result
      if (isWrite) {
        ensure(cacheVal, [field.name, argsKey], []);
      }
      ensure(targetVal, [resultName], []);

      // We iterate the list, copying the old values to the new values
      traverseList({
        depth: field.list,
        resultVal: resultVal[resultName],
        targetVal: targetVal[resultName],
        cacheVal: ensure(cacheVal, [field.name, argsKey], []),
      });
    } else {
      writeField({
        resultVal,
        targetVal,
        cacheVal,
      });
    }
  };

  const traverseFields = (options: SyncTraverseOptions) => {
    const { fields, cacheVal, resultVal, targetVal } = options;
    for (const field of fields) {
      if (field === __typename) {
        if (isWrite) {
          set(cacheVal, __typename, get(resultVal, __typename));
        }
        set(targetVal, __typename, get(cacheVal, __typename));
      } else if (typeof field === 'string') {
        if (isWrite) {
          setIn(cacheVal, [field, '$'], getIn(resultVal, [field]));
        }
        set(targetVal, field, getIn(cacheVal, [field, '$']));
      } else {
        handleField(field, options);
      }
    }
  };

  traverseFields({
    fields: meta.fields,
    cacheVal: cache.fields,
    resultVal: operationResult,
    targetVal: currentResult,
  });

  return { added, updated, changed, cache, result: currentResult };
}
