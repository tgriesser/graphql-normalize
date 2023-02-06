import type { GraphQLObjectType } from 'graphql';

export interface TypePolicies {
  /**
   * If defined, these are the keys we look for in an object to determine
   * identity, if no rule is defined otherwise. When we execute, we check
   * these keys to determine whether they exist on the type, and if so we
   * add them to the Document so we are able to cache against them
   *
   * Defaults to "id", "uuid", "_id"
   */
  defaultKeys?: string[];
  /**
   * A Map of TypeNames to keys used to determine identity for the
   * object
   *
   * Set to "null" to indicate the type should never be cached
   * Set to "__typename" to indicate the object is a singleton
   */
  typeKeys?: Record<string, string | string[] | null>;
}

export function getCacheKey(typePolicies: TypePolicies, objectType: GraphQLObjectType) {
  const { typeKeys = {}, defaultKeys = ['id', 'uuid', '_id'] } = typePolicies;
  const designatedKeys = typeKeys[objectType.name];
  if (designatedKeys === null) {
    return null;
  }
  if (designatedKeys) {
    if (designatedKeys === '__typename') {
      return objectType.name;
    }
    const keys = Array.isArray(designatedKeys) ? designatedKeys : [designatedKeys];
    return `${objectType.name}:${keys}`;
  }
  const objectKeys = Object.keys(objectType.getFields());
  const cacheKey = defaultKeys.find((f) => objectKeys.includes(f));
  if (cacheKey) {
    return `${objectType.name}:${cacheKey}`;
  }
  return null;
}
