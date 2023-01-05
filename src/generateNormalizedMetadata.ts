import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer';
import {
  DocumentNode,
  GraphQLSchema,
  Kind,
  TypeInfo,
  isAbstractType,
  isListType,
  isWrappingType,
  visit,
  print,
  visitWithTypeInfo,
  ArgumentNode,
  FieldNode,
  SelectionSetNode,
  OperationTypeNode,
  isObjectType,
} from 'graphql';
import stableStringify from 'fast-json-stable-stringify';
import type { FieldDef, FieldMeta, NormalizeMeta, NormalizedDoc, VariableMeta } from './extensionShape';
import { TypePolicies, getCacheKey } from './typePolicies';

/**
 * Given an operation and a schema, generates the metadata necessary to
 * write the operation into the cache
 */
export function generateNormalizedMetadata(
  schema: GraphQLSchema,
  operation: DocumentNode,
  typePolicies: TypePolicies = {}
): NormalizedDoc {
  let finalOperation = operation;
  if (operation.definitions.some((d) => d.kind === Kind.FRAGMENT_DEFINITION)) {
    finalOperation = optimizeDocuments(schema, [operation], {
      noLocation: true,
    })[0];
  }

  const typeInfo = new TypeInfo(schema);
  const normalizedDoc: NormalizedDoc = {
    operation: OperationTypeNode.QUERY,
    variables: [],
    selectionSet: {},
  };

  const fieldPath: any[] = [];

  function setPath<K extends keyof NormalizeMeta>(key: K, value: NormalizeMeta[K]) {
    normalizedDoc.selectionSet[fieldPath.join('.')] ??= {};
    normalizedDoc.selectionSet[fieldPath.join('.')][key] = value;
  }
  function normalizeArgs(nodes: readonly ArgumentNode[]) {
    let hasVar = false;
    const argsDef: Record<string, any> = {};
    for (const arg of nodes) {
      if (arg.value.kind === Kind.VARIABLE) {
        argsDef[`$${arg.name.value}`] = arg.name.value;
        hasVar = true;
      } else {
        argsDef[arg.name.value] = print(arg.value);
      }
    }
    return hasVar ? argsDef : stableStringify(argsDef);
  }
  function normalizeField(node: FieldNode) {
    if (node.alias || node.arguments?.length) {
      const field: FieldMeta = {
        name: node.name.value,
      };
      if (node.alias) field.alias = node.alias.value;
      if (node.arguments?.length) field.args = normalizeArgs(node.arguments);
      return field;
    }
    return node.name.value;
  }
  function addSelectionFields(node: SelectionSetNode) {
    const fields: FieldDef[] = [];
    for (const sel of node.selections) {
      if (sel.kind === Kind.FRAGMENT_SPREAD) {
        throw noFragments();
      }
      if (sel.kind === Kind.FIELD) {
        fields.push(normalizeField(sel));
      }
      // If we have an inline fragment
      if (sel.kind === Kind.INLINE_FRAGMENT) {
        //
      }
    }
    setPath('fields', fields);
  }

  const visitor = visitWithTypeInfo(typeInfo, {
    OperationDefinition(op) {
      normalizedDoc.operation = op.operation;
    },
    VariableDefinition(node) {
      const obj: VariableMeta = {
        name: node.variable.name.value,
      };
      if (node.defaultValue) {
        obj.defaultValue = print(node.defaultValue);
      }
      normalizedDoc.variables.push(obj);
    },
    Field: {
      enter(node) {
        if (node.alias?.value) {
          fieldPath.push(node.alias.value);
          setPath('aliasField', node.name.value);
        } else {
          fieldPath.push(node.name.value);
        }
        let gqlType = typeInfo.getType();
        while (isWrappingType(gqlType)) {
          if (isListType(gqlType)) {
            setPath('list', true);
            fieldPath.push('$idx');
          }
          gqlType = gqlType.ofType;
        }
        if (isAbstractType(gqlType)) {
          setPath(
            'possible',
            schema.getPossibleTypes(gqlType).map((t) => t.name)
          );
        }
        if (isObjectType(gqlType)) {
          const cacheKey = getCacheKey(typePolicies, gqlType);
          if (cacheKey) {
            setPath('cacheKey', cacheKey);
          }
        }
        if (node.arguments?.length) {
          setPath('args', normalizeArgs(node.arguments));
        }
        if (node.selectionSet) {
          addSelectionFields(node.selectionSet);
        }
      },
      leave(node) {
        fieldPath.pop();
        let gqlType = typeInfo.getType();
        while (isWrappingType(gqlType)) {
          if (isListType(gqlType)) {
            fieldPath.pop();
          }
          gqlType = gqlType.ofType;
        }
      },
    },
    InlineFragment: {
      enter(node) {
        if (node.typeCondition?.name) {
          fieldPath.push(`$type_${node.typeCondition?.name.value}`);
          addSelectionFields(node.selectionSet);
        }
      },
      leave(node) {
        if (node.typeCondition?.name.value) {
          fieldPath.pop();
        }
      },
    },
    FragmentDefinition() {
      throw noFragments();
    },
  });

  visit(finalOperation, visitor);

  return normalizedDoc;
}

function noFragments() {
  return new Error('Fragment definitions have been stripped');
}
