import produce, { Immutable } from 'immer';
import type { CacheShape } from './cache';

export class CacheContainer {
  #state: Immutable<CacheShape>;
  #subscribers: Function[] = [];

  constructor(initialState?: CacheShape) {
    this.#state = produce({ fields: {}, operations: {} }, (root) => initialState ?? root);
  }

  getState() {
    return this.#state;
  }

  subscribe(fn: (state: Immutable<CacheShape>) => void) {
    this.#subscribers.push(fn);
    return () => {
      this.#subscribers.splice(this.#subscribers.indexOf(fn), 1);
    };
  }
}
