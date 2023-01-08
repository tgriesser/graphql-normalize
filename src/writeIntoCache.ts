import type { FormattedExecutionResult } from 'graphql';
import type { FieldDef, FieldMeta, NormalizeMetaShape } from './metadataShapes';
import type { CacheShape } from './cache';
import { NO_ARGS, printArgs } from './printArgs';
import { makeCacheKey } from './makeCacheKey';
import { __typename } from './constants';

interface BuildCacheObj {
  meta: NormalizeMetaShape;
  result: FormattedExecutionResult;
  variableValues: Record<string, any>;
}

interface IterateFieldsConfig {
  into: any;
  existing: any;
  resultData: any;
  fields: FieldDef[];
  cachePath: Array<string | number>;
  resultPath: Array<string | number>;
}

/**
 * Write values into the cache, given the values, the existing cache,
 * and the new values that need to be written
 */
export function writeIntoCache(cacheFields: CacheShape['fields'], obj: BuildCacheObj) {
  const additions: Array<string[]> = [];
  const updates: Array<string[]> = [];

  const { meta, result, variableValues } = obj;

  const normalizedData = cacheFields;

  const currentDataStack: any[] = [];
  let currentData: any = result.data ?? {};

  const currentCacheStack: any[] = [];
  let currentCache = normalizedData;

  const setCurrentData = (data: any) => {
    currentDataStack.push(currentData);
    return (currentData = data);
  };
  const popCurrentData = () => {
    currentData = currentDataStack.pop();
  };
  const setCurrentCache = (obj: any) => {
    currentCacheStack.push(currentCache);
    return (currentCache = obj);
  };
  const popCurrentCache = () => {
    currentCache = currentCacheStack.pop();
  };

  const updateInCache = (path: Array<string | number>, data: any) => {
    //
  };

  function getValue(key: string) {
    return currentData[key];
  }

  function traverseFields(config: IterateFieldsConfig) {
    const {} = config;
    let updates: string[] = [];
    let additions: string[] = [];

    //
    const getVal = (config: IterateFieldsConfig, field: string) => {
      //
    };

    //
    const setValue = (config: IterateFieldsConfig, path: Array<string | number>, value: unknown) => {
      //
    };

    const getField = (path: Array<string | number>) => {
      return resultPath.concat(path).reduce((acc, key) => acc?.[key], cacheFields);
    };

    const { fields, into, existing, cachePath, resultPath } = config;
    for (const field of fields) {
      if (field === __typename) {
        setValue(existing, [__typename]);
      } else if (typeof field === 'string') {
        setValue(config, [field, NO_ARGS], getVal(config, field));
      } else {
        const argsKey = printArgs(field.args, meta, variableValues);
        const resultName = field.alias ?? field.name;
        const fieldData = getField(resultName);
      }
    }
  }

  // We want to iterate the known structure of the response shape, setting the values
  // in the result cache
  function iterateFields(fields: FieldDef[]) {
    if (getValue('__typename')) currentCache['__typename'] = getValue('__typename');
    for (const field of fields) {
      if (field === '__typename') {
        currentCache[field] = getValue(field);
      } else if (typeof field === 'string') {
        currentCache[field] ??= {};
        currentCache[field][NO_ARGS] = getValue(field);
      } else {
        _writeField(field);
      }
    }
  }

  function _writeField(field: FieldMeta, keyPath?: string[]) {
    setCurrentData(currentData[field.alias ?? field.name]);
    currentCache[field.name] ??= {};

    const fieldArgs = printArgs(field.args, meta, variableValues);

    keyPath ??= [field.name, fieldArgs];

    currentCache[field.name][fieldArgs] ??= getContainer(field);

    // When we have a list of items, we want to map over those, and treat
    // them as the metadata tells us to
    if (field.list) {
      if (currentData === null) {
        currentCache[field.name][fieldArgs] = null;
      } else {
        _handleList(field, fieldArgs);
      }
    } else {
      if (field.cacheKey) {
        const $ref = makeCacheKey(field.cacheKey, currentData);
        normalizedData[$ref] ??= {};
        currentCache[field.name][fieldArgs] = { $ref };
        setCurrentCache(normalizedData[$ref]);
      } else {
        setCurrentCache(currentCache[field.name][fieldArgs]);
      }

      if (field.possible) {
        // console.log(field, currentData);
      } else if (field.fields) {
        iterateFields(field.fields);
      }

      popCurrentCache();
    }

    popCurrentData();
  }

  // list: 1 --- ['abc', 'def']
  // list: 2 --- [['abc', 'def'], ['ghi']]
  // list: 3 --- [[['abc', 'def'], ['ded']], [['ded', 'ded2'], ['a']]]

  function _handleList(field: FieldMeta, fieldArgs: string) {
    const { list = 1, ...rest } = field;
    const listItem = (currentCache[field.name][fieldArgs] ??= []);

    let currentListData = currentData;
    for (const [idx, value] of (currentData as Array<any>).entries()) {
      if (value === null) {
        listItem.push(value);
        continue;
      }

      setCurrentData(value);
      if (field.cacheKey) {
        const $ref = makeCacheKey(field.cacheKey, value);
        listItem.push({ $ref });
        normalizedData[$ref] ??= {};
        setCurrentCache(normalizedData[$ref]);
        if (field.fields) {
          iterateFields(field.fields);
        }
        popCurrentCache();
      }

      // If we have a union type, determine the shape of the type and manage accordingly
      if (field.possible) {
        if (field.possible[currentData.__typename]) {
          const unionMeta = field.possible[currentData.__typename];
          if (unionMeta.cacheKey) {
            const $ref = makeCacheKey(unionMeta.cacheKey, value);
            listItem.push({ $ref });
            normalizedData[$ref] ??= {};
            setCurrentCache(normalizedData[$ref]);
            if (unionMeta.fields) {
              iterateFields(unionMeta.fields);
            }
            popCurrentCache();
          }
        } else {
          listItem.push(currentData);
        }
      }

      popCurrentData();
    }
  }

  iterateFields(meta.fields);

  return {
    additions,
    updates,
  };
}

function getContainer(field: FieldMeta) {
  return field.list ? [] : {};
}
