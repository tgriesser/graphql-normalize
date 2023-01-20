import type { CodegenPlugin } from '@graphql-codegen/plugin-helpers';
import type { DocumentNode } from 'graphql';
import { generateNormalizedOperations } from './generateNormalizedOperation';
import { generateNormalizedMetadataForDocs } from './generateNormalizedMetadata';
import type { NormalizeMetaShape } from '../metadataShapes';

export const NormalizeCodegenPlugin: CodegenPlugin['plugin'] = (schema, documents, config, info) => {
  const documentNodes = documents.map((d) => d.document).filter((d): d is DocumentNode => Boolean(d));
  const typePolicies = {
    defaultKeys: config.defaultKeys,
    typeKeys: config.typeKeys,
  };
  const ops = generateNormalizedOperations(schema, documentNodes, typePolicies);
  const normalizedMeta = generateNormalizedMetadataForDocs(schema, ops, typePolicies);
  const toPrint: Record<string, NormalizeMetaShape> = {};
  for (const { name, meta } of normalizedMeta) {
    toPrint[name] = meta;
  }
  return JSON.stringify(toPrint, null, 2);
};
