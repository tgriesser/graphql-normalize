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

/**
 * All of the necessary metadata needed
 */
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

export type FieldDef = string | FieldMeta;

export interface VariableMeta {
  name: string;
  defaultValue?: unknown;
}

export interface NormalizeMetaShape {
  operation: 'query' | 'mutation' | 'subscription';
  variables: VariableMeta[];
  fields: FieldDef[];
}

export interface NormalizedDocShape {
  name: string;
  meta: NormalizeMetaShape;
}
