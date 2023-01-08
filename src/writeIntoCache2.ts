import type { Immutable } from 'immer';
import type { CacheShape } from './cache';
import type { FieldDef, FieldMeta, NormalizeMetaShape } from './metadataShapes';
import { NO_ARGS, printArgs } from './printArgs';
import { copyList } from './copyList';
import type { FormattedExecutionResult } from 'graphql';
import { makeCacheKey } from './makeCacheKey';

interface WriteQueryIntoCache {
  mutate?: boolean;
  meta: NormalizeMetaShape;
  operationResult: Immutable<FormattedExecutionResult>;
  variableValues: Record<string, any>;
  currentCache?: CacheShape['fields'];
  isEqual?: (a: any, b: any) => boolean;
}

export class MissingFieldError {
  constructor(path: Array<string | number>) {
    throw new Error(`Missing field for: ${path.filter((p) => p !== NO_ARGS)}`);
  }
}

const defaultIsEqual = (a: any, b: any) => {
  return a === b;
};

interface TraverseFieldsConfig {
  into: any;
  existing: any;
  result: any;
  fields: FieldDef[];
  basePath: Array<string | number>;
}

/**
 * Writes a query into the cache
 */
export function writeQueryIntoCache<Q>(config: WriteQueryIntoCache) {
  const {
    meta,
    operationResult,
    variableValues = {},
    currentCache = {} as Q,
    isEqual = defaultIsEqual,
    mutate = true,
  } = config;

  const ensurePath = (obj: any, path: Array<string | number>) => {
    let result = obj;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (obj[key] === undefined) {
        obj[key] = typeof key === 'number' ? [] : {};
      }
      result = obj[key];
    }
    return result;
  };

  const getIn = (path: Array<string | number>) => {
    for (let i = 0; i < path.length; i++) {
      //
    }
  };

  const setIn = (path: Array<string | number>) => {
    //
  };

  const { fields, operation, variables } = config.meta;

  function shouldSkip(field: FieldMeta) {
    return false;
  }

  interface TraverseFieldsResult {
    additions: Array<string | number>[];
    updates: Array<string | number>[];
    cache: any;
  }

  function traverseFields(config: TraverseFieldsConfig): any {
    const updates: Array<string | number>[] = [];
    const additions: Array<string | number>[] = [];

    const { fields, into = {}, existing, result, basePath } = config;

    const getField = (path: Array<string | number>) => {
      return basePath.concat(path).reduce((acc, key) => acc?.[key], result);
    };

    const getValue = (path: Array<string | number>) => {
      return path.reduce((acc, key) => acc?.[key], existing);
    };

    const setField = (key: string, value: any) => {
      if (into[key] === undefined || !isEqual(into[key], value)) {
        into[key] = value;
        // updates.push();
      }
    };

    const setPath = (path: Array<string | number>, value: any) => {
      let writeInto = into;
      for (let i = 0; i < path.length; i++) {
        const key = path[i];
        const hasNext = i < path.length - 1;
        if (hasNext) {
          if (writeInto[key] === undefined) {
            writeInto[key] = typeof key === 'number' ? [] : {};
            writeInto = writeInto[key];
          } else {
            writeInto = writeInto[key];
          }
        } else if (!isEqual(writeInto[key], value)) {
          if (writeInto[key] === undefined) {
            additions.push(path);
          } else {
            updates.push(path);
          }
          writeInto[key] = value;
        }
      }
    };

    for (const field of fields) {
      if (field === '__typename') {
        setField(field, getField(['__typename']));
      } else if (typeof field === 'string') {
        setPath([field, NO_ARGS], getField([field]));
      } else {
        const argsKey = printArgs(field.args, meta, variableValues);
        const resultName = field.alias ?? field.name;
        const fieldData = getField([resultName]);
        const cacheData = getValue([field.name, argsKey]);

        // console.log({ fieldData, argsKey, resultName });
        // if (shouldSkip(field)) {
        //   if (resultName in into) {
        //     delete into[resultName];
        //     changed = true;
        //     continue;
        //   }
        // }

        // If we have a null value, there's nothing more to do here
        if (fieldData === null) {
          setPath([field.name, argsKey], null);
          continue;
        }

        const handleField = (indexes: number[] = []) => {
          const resultValue = getField([resultName, ...indexes]);
          const cacheKey = field.cacheKey ? makeCacheKey(field.cacheKey, resultValue) : undefined;
          const fieldPath = cacheKey ? [cacheKey] : basePath.concat([resultName]).concat(indexes);

          if (field.fields) {
            const { additions, updates, cache } = traverseFields({
              into: currentCache,
              existing: currentCache,
              fields: field.fields,
              basePath: fieldPath,
              result: result[resultName],
            });
          }

          return cacheKey ? { $ref: cacheKey } : resultValue;
        };

        // If we know we have a list, copy items at the depth of the list
        if (field.list) {
          const { list, modified } = copyList({
            isEqual,
            source: Array.isArray(fieldData) ? fieldData : [],
            depth: field.list,
            target: into[field.name]?.[argsKey] ?? [],
            onValue: (existingValue, newValue, indexes) => {
              return handleField(indexes);
            },
          });
          if (modified) {
            setPath([field.name, argsKey], list);
          }
        } else {
          // ['posts', {first: 10}, { $ref: 1 }]
          setPath([field.name, argsKey], handleField());
        }
      }
    }

    const hasChanges = updates.length || additions.length || mutate;

    return { updates, additions, cache: hasChanges ? into : existing };
  }

  const obj = traverseFields({
    into: mutate ? currentCache : { ...currentCache },
    existing: currentCache,
    fields,
    basePath: [],
    result: operationResult.data,
  });

  return obj;
}
