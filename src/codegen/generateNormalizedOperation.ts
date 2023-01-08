import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer';
import { DocumentNode, GraphQLSchema, Kind } from 'graphql';
import { addNormalizingFields } from './addNormalizingFields';

/**
 * Given a schema & operation, flattens the fragments and adds any necessary missing fields
 * in order to properly normalize the response in a cache.
 */
export function generateNormalizedOperation(schema: GraphQLSchema, operation: DocumentNode) {
  let finalOperation = operation;
  if (operation.definitions.some((d) => d.kind === Kind.FRAGMENT_DEFINITION)) {
    finalOperation = optimizeDocuments(schema, [operation], {
      noLocation: true,
    })[0];
  }
  return addNormalizingFields(schema, finalOperation);
}
