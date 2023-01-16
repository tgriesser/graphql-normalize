import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer';
import { DocumentNode, GraphQLSchema, Kind } from 'graphql';
import { addNormalizingFields } from './addNormalizingFields';
import type { TypePolicies } from './getCacheKey';

export function generateNormalizedOperation(
  schema: GraphQLSchema,
  document: DocumentNode,
  typePolicies: TypePolicies = {}
) {
  return generateNormalizedOperations(schema, [document], typePolicies)[0];
}

/**
 * Given a schema & operation, flattens the fragments and adds any necessary missing fields
 * in order to properly normalize the response in a cache.
 */
export function generateNormalizedOperations(
  schema: GraphQLSchema,
  documents: DocumentNode[],
  typePolicies: TypePolicies = {}
) {
  let toNormalize = documents;
  if (documents.some((o) => o.definitions.some((d) => d.kind === Kind.FRAGMENT_DEFINITION))) {
    toNormalize = optimizeDocuments(schema, documents, {
      noLocation: true,
      includeFragments: false,
    });
  }
  return addNormalizingFields(schema, toNormalize, typePolicies);
}
