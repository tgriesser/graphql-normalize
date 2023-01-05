import type { FormattedExecutionResult } from 'graphql';

interface VisitorNodeInfo {
  key: string | number;
  path: Array<string | number>;
  stack: any[];
  value: unknown;
}

type LeaveFn = () => void;

interface Visitor {
  enter(node: VisitorNodeInfo): void | LeaveFn | false;
  leave(node: VisitorNodeInfo): void | false;
}

export function walk(root: FormattedExecutionResult, visitor: Visitor) {
  let path: Array<string | number> = [];
  let stack: any[] = [];

  function traverseElement(parent: any, key: any) {
    path.push(key);
    const element = parent[key];
    const node = { key, path, stack, value: element };
    const enterResult = visitor.enter(node);

    // If we return false from enter, it means we should no-longer continue walking the items in the object
    if (enterResult !== false) {
      if (Array.isArray(element) || (typeof element === 'object' && element !== null)) {
        traverse(element);
      }
    }

    if (typeof enterResult === 'function') {
      enterResult();
    }

    visitor.leave(node);
    path.pop();
  }

  function traverse(val: any) {
    stack.push(val);
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        traverseElement(val, i);
      }
    } else if (typeof val === 'object' && val != null) {
      const objKeys = Object.keys(val).sort();
      for (let i = 0; i < objKeys.length; i++) {
        traverseElement(val, objKeys[i]);
      }
    }
    stack.pop();
  }

  traverse(root.data ?? {});
}
