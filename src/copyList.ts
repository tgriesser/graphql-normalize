interface CopyListConfig {
  /**
   * The source list of values we're looking to copy
   */
  source: Array<any>;
  /**
   * The target list the source will be copied into,
   * used for equality checking
   */
  target: Array<any>;
  /**
   * Whether we mutate the target, or create a new list
   * when modifications occur
   * @default true
   */
  mutate?: boolean;
  /**
   * Depth of items to copy. Once we've hit the depth,
   * even if there are further arrays, we'll use equality checking
   */
  depth: number;
  currentDepth?: number;
  indexes?: number[];
  isEqual: (a: any, b: any) => boolean;
  /**
   * Called with the existing & new values, as well as the indexes
   * of the current array
   */
  onValue: (existingValue: any, newValue: any, indexes: number[]) => any;
}

/**
 * Recursively & mutatively copies a list, up to a specified depth.
 *
 * The list mutation is intentionally mutable, as this is intended to be
 * executed within an "immer" produce function, which deals with immutability
 */
export function copyList(config: CopyListConfig) {
  const { source, target, depth, currentDepth = 1, onValue, indexes = [], isEqual } = config;
  let modified = false;
  if (source.length < target.length) {
    modified = true;
    target.length = source.length;
  }
  for (let i = 0; i < source.length; i++) {
    const value = source[i];
    if (value === null) {
      if (target[i] !== null) {
        target[i] = null;
        modified = true;
      }
      continue;
    }
    if (currentDepth < depth) {
      const { list, modified: innerModified } = copyList({
        ...config,
        source: value,
        target: target[i] ?? [],
        currentDepth: currentDepth + 1,
        indexes: indexes.concat(i),
      });
      if (innerModified) modified = true;
      target[i] = list;
    } else {
      const newValue = onValue(target[i], value, indexes.concat(i));
      if (!isEqual(newValue, target[i])) {
        target[i] = newValue;
        modified = true;
      }
    }
  }
  return { list: target, modified };
}
