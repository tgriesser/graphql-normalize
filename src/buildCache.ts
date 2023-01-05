import type { FormattedExecutionResult } from 'graphql';
import type { ArgDef, FieldDef, FieldMeta, NormalizedDoc } from './extensionShape';
import { stringifyVariables } from './stringifyVariables';

interface BuildCacheObj {
  meta: NormalizedDoc;
  result: FormattedExecutionResult;
  variableValues: Record<string, any>;
}

const NO_ARGS = '^NO_ARGS';

/**
 * Write values into the cache, given the values, the existing cache,
 * and the new values that need to be written
 */
export function buildCache(obj: BuildCacheObj) {
  const { meta, result, variableValues } = obj;

  const normalizedData: Record<string, any> = {};

  const currentDataStack: any[] = [];
  let currentData: any = result.data ?? {};

  const currentCacheStack: any[] = [];
  let currentCache = normalizedData;

  function setCurrentData(data: any) {
    currentDataStack.push(currentData);
    currentData = data;
  }
  function popCurrentData() {
    currentData = currentDataStack.pop();
  }
  function setCurrentCache(obj: any) {
    currentCacheStack.push(currentCache);
    currentCache = obj;
  }
  function popCurrentCache() {
    currentCache = currentCacheStack.pop();
  }

  function getValue(key: string) {
    return currentData[key];
  }

  function getArgValue(key: string) {
    return variableValues[key] ?? meta.variables.find((k) => k.name === key)?.defaultValue;
  }

  function printArgs(args: string | ArgDef | undefined) {
    if (args === undefined) return NO_ARGS;
    if (typeof args === 'string') return args;
    const argsObj: Record<string, any> = {};
    for (const key of Object.keys(args).sort()) {
      if (key.startsWith('$')) {
        argsObj[args[key]] = getArgValue(key.slice(1));
      }
    }
    return stringifyVariables(argsObj);
  }

  // We want to iterate the known structure of the response shape, setting the values
  // in the result cache
  function iterateFields(fields: FieldDef[]) {
    for (const field of fields) {
      if (field === '__typename') {
        currentCache[field] = getValue(field);
      } else if (typeof field === 'string') {
        currentCache[field] ??= {};
        currentCache[field]['^NO_ARGS'] = getValue(field);
      } else {
        _writeField(field);
      }
    }
  }

  function _writeField(field: FieldMeta, keyPath?: string[]) {
    setCurrentData(currentData[field.alias ?? field.name]);
    currentCache[field.name] ??= {};

    const fieldArgs = printArgs(field.args);

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

  function _handleList(field: FieldMeta, fieldArgs: string) {
    const { list, ...rest } = field;
    const listItem = (currentCache[field.name][fieldArgs] ??= []);

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

  return normalizedData;
}

function makeCacheKey(key: string, obj: any) {
  const [type, fields] = key.split(':');
  if (fields.indexOf(',') !== -1) {
    return `${type}:${stringifyVariables(fields.split(',').map((k) => obj[k]))}`;
  }
  return `${type}:${obj[fields]}`;
}

function getContainer(field: FieldMeta) {
  return field.list ? [] : {};
}
