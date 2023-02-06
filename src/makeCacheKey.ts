import { stringifyVariables } from './stringifyVariables.js'

/**
 * Given a cache key and an object, generates the normalized key.
 * Assumes the query contains the necessary fields to generate the cache key,
 * meaning it has been run through the generateNormalizedOperation / addNormalizedFields
 * code generation functions
 */
export function makeCacheKey(key: string, obj: any) {
  const [type, fields] = key.split(':')
  if (fields === undefined) {
    return type
  }
  if (fields.indexOf(',') !== -1) {
    return `${type}:${stringifyVariables(fields.split(',').map((k) => obj[k]))}`
  }
  return `${type}:${obj[fields]}`
}
