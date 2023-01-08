import { stringifyVariables } from './stringifyVariables';

/**
 * Given a cache key and an object,
 */
export function makeCacheKey(key: string, obj: any) {
  const [type, fields] = key.split(':');
  if (fields === undefined) {
    return type;
  }
  if (fields.indexOf(',') !== -1) {
    return `${type}:${stringifyVariables(fields.split(',').map((k) => obj[k]))}`;
  }
  return `${type}:${obj[fields]}`;
}
