import type { Immutable } from 'immer';
import type { CacheShape } from './cache';
import type { FieldDef, FieldMeta, NormalizeMetaShape } from './metadataShapes';
import { NO_ARGS, printArgs } from './printArgs';
import { copyList } from './copyList';

interface ReadQueryFromCache<Q> {
  meta: NormalizeMetaShape;
  cacheFields: Immutable<CacheShape['fields']>;
  variableValues: Record<string, any>;
  existing?: Q;
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
  fields: FieldDef[];
  basePath: Array<string | number>;
}

/**
 * Reads a query from the cache. We do this in order to ensure we're only
 * providing the fields the original query has requested, rather than
 * any additional fields fetched in the process of normalization
 */
export function readQueryFromCache<Q>(config: ReadQueryFromCache<Q>): Q {
  const { meta, cacheFields, variableValues = {}, existing = {} as Q, isEqual = defaultIsEqual } = config;
  const { fields, operation, variables } = config.meta;

  function shouldSkip(field: FieldMeta) {
    return false;
  }

  function traverseFields(config: TraverseFieldsConfig): any {
    const { fields, into = {}, existing, basePath } = config;
    let changed = false;

    const getField = (path: Array<string | number>) => {
      return basePath.concat(path).reduce((acc, key) => acc?.[key], cacheFields);
    };

    const getValue = (path: Array<string | number>) => {
      return path.reduce((acc, key) => acc?.[key], existing);
    };

    const setField = (key: string, value: any) => {
      if (Array.isArray(into) && typeof key !== 'number') {
        // console.log({ into, key, basePath });
      }

      if (into[key] === undefined || !isEqual(into[key], value)) {
        into[key] = value;
        changed = true;
      }
    };

    for (const field of fields) {
      if (field === '__typename') {
        setField(field, getField(['__typename']));
      } else if (typeof field === 'string') {
        setField(field, getField([field, NO_ARGS]));
      } else {
        const argsKey = printArgs(field.args, meta, variableValues);
        const resultName = field.alias ?? field.name;
        const fieldData = getField([field.name, argsKey]);

        if (shouldSkip(field)) {
          if (resultName in into) {
            delete into[resultName];
            changed = true;
            continue;
          }
        }

        // If we have a null value, there's nothing more to do here
        if (fieldData === null) {
          setField(resultName, null);
          continue;
        }

        const handleField = (indexes: number[] = []) => {
          const cachedValue = getField([field.name, argsKey, ...indexes]);
          const fieldPath = field.cacheKey
            ? [cachedValue.$ref]
            : basePath.concat([field.name, argsKey]).concat(indexes);

          if (field.fields) {
            const { changed, result } = traverseFields({
              into: getValue([resultName, ...indexes]) ?? {},
              existing: existing?.[resultName],
              fields: field.fields,
              basePath: fieldPath,
            });

            return result;
          }
        };

        // If we know we have a list, copy items at the depth of the list
        if (field.list) {
          const { list, modified } = copyList({
            isEqual,
            source: Array.isArray(fieldData) ? fieldData : [],
            depth: field.list,
            target: into[resultName] ?? [],
            onValue: (existingValue, newValue, indexes) => handleField(indexes),
          });
          if (modified) {
            setField(resultName, list);
          }
        } else {
          into[resultName] = handleField();
        }
      }
    }

    return { changed, result: into };
  }

  const { changed, result } = traverseFields({
    into: existing,
    existing,
    fields,
    basePath: [],
  });

  return changed ? result : existing;
}
