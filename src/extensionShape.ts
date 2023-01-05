import type { OperationTypeNode } from 'graphql';

type CacheKey = string;

export interface ArgDef {
  [knownKey: string]: any;
  [replaceKey: `$${string}`]: string;
}

type Depth = number;

export interface UnionMeta {
  fields: FieldDef[];
  cacheKey?: CacheKey;
}

export interface FieldMeta {
  name: string;
  alias?: string;
  cacheKey?: CacheKey;
  args?: ArgDef | string;
  list?: Depth;
  possible?: Record<string, UnionMeta>;
  fields?: FieldDef[];
  skip?: ArgDef | string;
  include?: ArgDef | string;
}

interface ExtensionsShape {
  graphqlNormalize: NormalizedDoc;
}

export type FieldDef = string | FieldMeta;

export interface VariableMeta {
  name: string;
  defaultValue?: unknown;
}

export interface NormalizedDoc {
  operation: OperationTypeNode;
  variables: VariableMeta[];
  fields: FieldDef[];
}
