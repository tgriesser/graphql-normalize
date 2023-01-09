import type { NormalizeMetaShape } from './metadataShapes';

export interface CacheShape {
  operations: {
    // The metadata for each query
    [hash: string]: {
      meta: NormalizeMetaShape;
    };
  };
  fields: {
    [key: string]: any;
  };
}
