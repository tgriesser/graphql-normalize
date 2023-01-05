import type { OperationTypeNode } from 'graphql';

type CacheKey = string;

export interface ArgDef {
  [knownKey: string]: any;
  [replaceKey: `$${string}`]: string;
}

export interface NormalizeMeta {
  aliasField?: string;
  cacheKey?: CacheKey;
  args?: ArgDef | string;
  list?: boolean;
  possible?: string[];
  fields?: FieldDef[];
  skip?: ArgDef | string;
  include?: ArgDef | string;
}

interface ExtensionsShape {
  graphqlNormalize: NormalizedDoc;
}

export interface FieldMeta {
  name: string;
  alias?: string;
  args?: ArgDef | string;
}

export type FieldDef = string | FieldMeta;

export interface VariableMeta {
  name: string;
  defaultValue?: unknown;
}

export interface NormalizedDoc {
  operation: OperationTypeNode;
  variables: VariableMeta[];
  selectionSet: Record<string, NormalizeMeta>;
}
