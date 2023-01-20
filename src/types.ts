import type { GraphQLFormattedError } from 'graphql';
import type { NormalizeMetaShape } from './codegen';

export interface SerializedQueryOperations {
  [operationName: string]: {
    hash: string;
    variableValues: any;
    meta: NormalizeMetaShape;
    errors?: GraphQLFormattedError[];
  };
}

export interface SerializedQueryCache {
  cache?: any;
  operations?: SerializedQueryOperations;
}
