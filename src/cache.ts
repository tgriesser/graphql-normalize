import type { NormalizeMetaShape } from './metadataShapes';

type ArgsKey = string;

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
