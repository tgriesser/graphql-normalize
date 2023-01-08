import {
  DocumentNode,
  GraphQLNamedOutputType,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
  TypeInfo,
  getNamedType,
  isAbstractType,
  isObjectType,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import type { TypePolicies } from '../typePolicies';

/**
 * Adds the fields necessary to normalize the result on the client. Simpler
 * than enforcing that the query definition always include these fields
 *
 * We do this after we generate the metadata nessary to normalize, so
 * we don't provide more info in the response than was originally requested by
 * the user, while still properly keeping object identity as best we can
 */
export function addNormalizingFields(schema: GraphQLSchema, operation: DocumentNode, typePolicies: TypePolicies = {}) {
  const missingTypes: string[] = [];
  const { typeKeys = {}, defaultKeys = ['id', 'uuid', '_id', 'cursor'] } = typePolicies;

  for (const type of Object.keys(typeKeys)) {
    if (!schema.getType(type)) {
      missingTypes.push(type);
    }
  }

  if (missingTypes.length) {
    throw new Error(`Missing types ${missingTypes} seen in typeKeys`);
  }

  const rootTypeNames: string[] = [
    schema.getQueryType()?.name,
    schema.getMutationType()?.name,
    schema.getSubscriptionType()?.name,
  ].filter((t): t is string => Boolean(t));

  const typeInfo = new TypeInfo(schema);

  function hasField(node: SelectionSetNode, fieldName: string) {
    return node.selections.some((s) => s.kind === Kind.FIELD && s.name.value === fieldName);
  }

  function hasTypename(node: SelectionSetNode) {
    return hasField(node, '__typename');
  }

  function getCacheField(namedType: GraphQLObjectType) {
    return Object.keys(namedType.getFields()).find((f) => defaultKeys.includes(f));
  }

  function hasCacheField(namedType: GraphQLObjectType) {
    return getCacheField(namedType);
  }

  function getNeededFields(node: SelectionSetNode, namedType: GraphQLNamedOutputType) {
    const neededFields: string[] = [];
    if (needsTypenameField(node, namedType)) {
      neededFields.push('__typename');
    }
    if (isObjectType(namedType)) {
      const fieldKeys = typeKeys[namedType.name];
      if (fieldKeys) {
        const needed = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];
        for (const f of needed) {
          if (!hasField(node, f)) {
            neededFields.push(f);
          }
        }
      } else {
        const cacheField = getCacheField(namedType);
        if (cacheField) {
          neededFields.push(cacheField);
        }
      }
    }
    return neededFields;
  }

  function needsTypenameField(node: SelectionSetNode, namedType: GraphQLNamedOutputType) {
    if (hasTypename(node)) {
      return false;
    }
    if (typeKeys[namedType.name] === null) {
      return false;
    }
    if (typeKeys[namedType.name]) {
      return true;
    }
    if (isAbstractType(namedType)) {
      return true;
    }
    if (isObjectType(namedType) && hasCacheField(namedType)) {
      return true;
    }
    return false;
  }

  const visitor = visitWithTypeInfo(typeInfo, {
    SelectionSet(node) {
      const currentType = typeInfo.getType();
      if (!currentType) {
        throw new Error(`Unknown type for selectionSet`);
      }
      const namedType = getNamedType(currentType);
      const typeName = namedType.name;
      if (rootTypeNames.includes(typeName)) {
        return;
      }
      let finalNode = node;
      const neededFields = getNeededFields(node, namedType);
      for (const field of neededFields) {
        finalNode = withField(finalNode, field);
      }
      return finalNode;
    },
  });

  return visit(operation, visitor);
}

function withField(node: SelectionSetNode, name: string): SelectionSetNode {
  return {
    ...node,
    selections: [
      {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: name,
        },
      },
      ...node.selections,
    ],
  };
}
