import produce, { immerable } from 'immer';

const enum t {
  FALSE = 0,
  TRUE = 1,
  FIELD,
  TYPE,
  ARGS,
  ARG,
  VALUE,
  SELECTIONS,
  VARIABLE,
  UNION,
  REF,
  ALIAS,
  SKIP,
  INCLUDE,
  LIST,
  NON_NULL,
  OPERATION_HASH,
  OPERATION_NAME,
  OPERATION_TYPE,
  VARIABLE_DEFINITIONS,
  QUERY,
  MUTATION,
  NO_ARGS,
}

const NO_ARGS = '^NO_ARGS' as const;

class ListIndex {
  constructor(public index: number, public length: number) {}
}

class CacheRef {
  [immerable] = true;
  constructor(public typeName: string, public id?: string) {}
  isEqual(ref: any) {
    return isCacheRef(ref) && ref.typeName === this.typeName && ref.id === this.id;
  }
}

function isCacheRef(val: any): val is CacheRef {
  return val instanceof CacheRef;
}

class CacheValue {
  [immerable] = true;
  constructor(public value: unknown) {}
  isEqual(val: any) {
    return isCacheValue(val) && this.value === val.value;
  }
}

function isCacheValue(val: any): val is CacheValue {
  return val instanceof CacheValue;
}

type FieldName = string;

type CacheRefOrValue = CacheRef | CacheValue;

interface FieldCacheShape {
  [idx: number]: FieldCacheShape | Record<FieldName, FieldCacheShape> | CacheRefOrValue;
  [serializedArgs: string]: FieldCacheShape | Record<FieldName, FieldCacheShape> | CacheRefOrValue;
}

interface CacheShaped {
  [typeName: string]: Record<FieldName, FieldCacheShape>;
}

type GetCurrentResult =
  | {
      key: number;
      value: CacheRefOrValue | undefined;
      container: Array<CacheRefOrValue>;
    }
  | {
      key: string;
      value: CacheRefOrValue | undefined;
      container: Record<string, CacheRefOrValue>;
    };

/**
 * A QueryContainer takes a given operationShape, and attempts to source the data
 * to resolve the query from the normalized cache store. It does so in a way that
 * is immutable, only the data which has changed will be updated.
 */
export class QueryContainer {
  lastState?: CacheShaped;
  lastQueryShape?: unknown;
  lastVariablesShape?: unknown;
  hasFetched?: boolean;
  refs = new Set<CacheRef>();

  constructor(
    readonly operationShape: OperationShape,
    private getState: () => CacheShaped,
    private setState: (fn: (draft: CacheShaped) => void) => void,
    initialValue?: unknown,
    initialVariables?: unknown
  ) {
    // If we have an initial value, set it as the "last query shape",
    // and assume it's good, since we just set it
    this.lastQueryShape = initialValue ? produce(() => initialValue) : undefined;
    this.lastVariablesShape = initialVariables ? produce(() => initialVariables ?? {}) : undefined;

    // We also want to write it into the root cache
    if (this.lastQueryShape) {
      this.#mergeResult(this.lastQueryShape);
    }

    // We assume the cache is good after we've written the value in there.
    // Last write wins in our case, avoids re-constituting the query we know to be good
    this.lastState = this.getState();
  }

  getValue() {
    if (this.lastState === this.getState()) {
      return this.lastQueryShape;
    }
  }

  /**
   * CacheSelectionNode<path: ['Viewer'], selections: [
   *   CacheValueNode<path: ['countFormsActive', NO_ARGS], value: CacheValue<0>>,
   *   CacheValueNode<path: ['countFormsArchived', NO_ARGS], value: CacheValue<1>>,
   *   CacheValueNode<path: ['countFormsArchived', NO_ARGS], value: CacheValue<0>>,
   *   CacheValueNode<path: ['projects', '{first: 10}', 'nodes', NO_ARGS, Idx<index: 0, length: 1>], value: CacheRef('Project', 'ba34de34d...')>
   * ]>
   *
   * CacheSelectionNode<path: ['Project:ba34de34d', selections: [
   *   CacheValueNode<path: ['id'], value: CacheValue<'ba34de34d'>>
   * ]]>
   */
  #mergeResult(result: any) {
    this.setState((draft) => {
      this.#visitObject(result, (node) => {
        /**
         * Given a current CacheKeyPath, gets the current value at that path,
         * creating a container object or Array for the value if it doesn't already exist
         */
        function getCurrent(path: CacheKeyPath, current: any) {
          for (let i = 0; i < path.length; i++) {
            const key = path[i];
            const next = path[i + 1];
            const actualKey = isListIndex(key) ? key.index : key;
            if (current[actualKey] === undefined) {
              current[actualKey] = isListIndex(next) ? [] : {};
            }
            let prev = current;

            // If we already have a value here, and the length of the list has shortened,
            // we need to slice the array to the new length, setting the length property
            // is a simple way to do this in JS
            if (prev[actualKey] && isListIndex(key) && current.length > key.length) {
              current.length = key.length;
            }

            // Once we get to the end of the array, we return the value, as well as
            // the current "container" and key to set it if the value has changed
            if (next === undefined) {
              return {
                key: actualKey,
                value: current[actualKey] as CacheRefOrValue | undefined,
                container: current,
              } as GetCurrentResult;
            } else {
              current = current[actualKey];
            }
          }
          throw new Error('Unreachable');
        }

        function visitNode(node: CacheNode, current: any) {
          const { value, key, container } = getCurrent(node.cacheKeyPath, current);
          // A cache selection node has subfields, we recurse through those
          // fields until we've visited all nodes
          if (isCacheSelectionNode(node)) {
            for (const selection of node.selections) {
              visitNode(selection, value);
            }
          } else if (isCacheValueNode(node)) {
            if (!node.value.isEqual(value)) {
              // Strange, I believe that this association in the types was handled
              // properly more recent TypeScript versions
              // @ts-expect-error
              container[key] = node.value;
            }
          }
        }

        // Visit the node, modifying the current state as necessary
        visitNode(node, draft);
      });
    });
  }

  #visit(result: any, visitFn: VisitFn) {
    //
  }

  #visitObject(result: any, visitFn: VisitFn, path: Array<string | number> = [], definitionPath: string[] = []) {
    const operationShape = this.operationShape;
    const baseSelections = operationShape[t.SELECTIONS];

    // Get the current selection set
    const selectionSet: Record<string, SelectionShape> = definitionPath.reduce((result, key) => {
      if (!result[key]) {
        throw new Error(`Unexpected key ${key}`);
      }
      const nextShape = result[key];
      assertsHasSelections(nextShape);
      return nextShape[t.SELECTIONS];
    }, baseSelections);

    for (const [key, val] of Object.entries(result)) {
      const fieldShape = selectionSet[key];
      const currentPath = path.concat(key);
      visitFn();
      for (const p of currentDefPath) {
      }
    }
  }

  #visitList(result: any, visitFn: VisitFn, path: Array<string | number>, definitionPath: string[]) {
    //
  }

  #deriveResult() {
    //
  }
}

interface EnterInfo {
  currentValue: unknown;
  previousValue: unknown;
  path: string;
  isList: boolean;
}

type CacheKeyPath = Array<string | ListIndex>;

type CacheNode = CacheValueNode | CacheSelectionNode;

class CacheValueNode {
  constructor(readonly cacheKeyPath: CacheKeyPath, readonly value: CacheRefOrValue) {}
}

class CacheSelectionNode {
  constructor(readonly cacheKeyPath: CacheKeyPath, readonly selections: CacheNode[]) {}
}

function isListIndex(v: string | ListIndex): v is ListIndex {
  return v instanceof ListIndex;
}

function isCacheValueNode(v: CacheNode): v is CacheValueNode {
  return v instanceof CacheValueNode;
}

function isCacheSelectionNode(v: CacheNode): v is CacheSelectionNode {
  return v instanceof CacheSelectionNode;
}

type VisitFn = (node: CacheNode) => void;

/**
 * Given an operation, normalizes the result in the cache, accounting for
 * the cyclical nature of GraphQL objects.
 */
export function normalizeData() {
  /**
   * fragment FormsListTableRows on FormDefinitionConnection {
   *   nodes {
   *     id
   *     uuid
   *     name
   *     submissionCount
   *     fieldCount
   *     status
   *   }
   * }
   *
   * query CreateForm {
   *   viewer {
   *     forms(first: 100, after: $after) {
   *       ...FormsListTableRows
   *     }
   *   }
   * }
   */
}

export interface UseQueryOpts {
  operationName: string;
  operationHash: string;
}

type SelectionSet = Record<FieldName, SelectionShape>;

type TypeShape = {
  [t.NON_NULL]: t.FALSE | t.TRUE;
  [t.LIST]?: boolean;
  [t.VALUE]?: TypeShape | string;
};

interface SelectionShape {
  [t.TYPE]: TypeShape;
  [t.ALIAS]?: string;
  [t.INCLUDE]?: string;
  [t.SKIP]?: string;
  [t.SELECTIONS]?: SelectionSet;
}

interface VariableDefinitionShape {
  [t.VARIABLE]: string;
}

interface OperationShape {
  [t.OPERATION_HASH]: string;
  [t.OPERATION_NAME]: string;
  [t.OPERATION_TYPE]: t.QUERY | t.MUTATION;
  [t.SELECTIONS]: SelectionSet;
  [t.VARIABLE_DEFINITIONS]: Array<VariableDefinitionShape>;
}

function hasSelectionSet(shape: SelectionShape): shape is SelectionShape & { [t.SELECTIONS]: SelectionSet } {
  return Boolean(shape[t.SELECTIONS]);
}

function assertsHasSelections(
  shape: SelectionShape
): asserts shape is SelectionShape & { [t.SELECTIONS]: SelectionSet } {
  if (!hasSelectionSet(shape)) {
    throw new Error(`Expected shape to have a selectionSet`);
  }
}

function assertIsNumber(key: string | number): asserts key is number {
  if (typeof key !== 'number') {
    throw new Error(`Expected key to be a number`);
  }
}
