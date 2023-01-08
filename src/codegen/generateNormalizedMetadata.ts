import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer';
import {
  DocumentNode,
  GraphQLSchema,
  Kind,
  TypeInfo,
  isListType,
  isWrappingType,
  visit,
  print,
  visitWithTypeInfo,
  ArgumentNode,
  FieldNode,
  OperationTypeNode,
  isObjectType,
  isScalarType,
  InlineFragmentNode,
  getNamedType,
  assertObjectType,
} from 'graphql';
import type { FieldDef, FieldMeta, NormalizeMetaShape, UnionMeta, VariableMeta } from '../metadataShapes';
import { TypePolicies, getCacheKey } from '../typePolicies';
import { stringifyVariables } from '../stringifyVariables';

/**
 * Given an operation and a schema, generates the metadata necessary to
 * write the operation into the cache
 */
export function generateNormalizedMetadata(
  schema: GraphQLSchema,
  operation: DocumentNode,
  typePolicies: TypePolicies = {}
): NormalizeMetaShape {
  let finalOperation = operation;
  if (operation.definitions.some((d) => d.kind === Kind.FRAGMENT_DEFINITION)) {
    finalOperation = optimizeDocuments(schema, [operation], {
      noLocation: true,
    })[0];
  }

  const typeInfo = new TypeInfo(schema);
  const normalizedDoc: NormalizeMetaShape = {
    operation: OperationTypeNode.QUERY,
    variables: [],
    fields: [],
  };

  let parentStack: Array<FieldMeta | UnionMeta | NormalizeMetaShape> = [];
  let parentFieldDef: FieldMeta | NormalizeMetaShape | UnionMeta = normalizedDoc;

  function popStack() {
    const parent = parentStack.pop();
    if (parent) {
      parentFieldDef = parent;
    }
  }

  function pushField(field: string | FieldDef) {
    parentFieldDef.fields ??= [];
    parentFieldDef.fields.push(field);
    if (typeof field !== 'string') {
      parentStack.push(parentFieldDef);
      parentFieldDef = field;
    }
  }

  function normalizeArgs(nodes: readonly ArgumentNode[]) {
    let hasVar = false;
    const argsDef: Record<string, any> = {};
    for (const arg of nodes) {
      if (arg.value.kind === Kind.VARIABLE) {
        argsDef[`$${arg.value.name.value}`] = arg.name.value;
        hasVar = true;
      } else {
        argsDef[arg.name.value] = print(arg.value);
      }
    }
    return hasVar ? argsDef : stringifyVariables(argsDef);
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
        const { gqlType, listDepth } = unpackType(typeInfo);

        // If this is a boring ol scalar, we push it as a string
        if (isBoringScalar(node, typeInfo)) {
          pushField(node.name.value);
          return;
        }

        const fieldMeta: FieldMeta = { name: node.name.value };
        pushField(fieldMeta);

        if (listDepth) fieldMeta.list = listDepth;
        if (node.alias?.value) fieldMeta.alias = node.alias.value;

        if (isObjectType(gqlType)) {
          const cacheKey = getCacheKey(typePolicies, gqlType);
          if (cacheKey) {
            fieldMeta.cacheKey = cacheKey;
          }
        }
        if (node.arguments?.length) {
          fieldMeta.args = normalizeArgs(node.arguments);
        }

        const skipDirective = node.directives?.find((d) => d.name.value === 'skip');
        const includeDirective = node.directives?.find((d) => d.name.value === 'include');
        if (skipDirective) {
          fieldMeta.skip = normalizeArgs(skipDirective.arguments ?? []);
        }
        if (includeDirective) {
          fieldMeta.include = normalizeArgs(includeDirective.arguments ?? []);
        }
      },
      leave(node) {
        // Pop things back into place
        if (!isBoringScalar(node, typeInfo)) {
          popStack();
        }
      },
    },
    InlineFragment: {
      enter(node) {
        if (
          node.typeCondition?.name.value &&
          isConcreteAbstract(node, typeInfo, schema) &&
          parentIsFieldMeta(parentFieldDef)
        ) {
          const unionType: UnionMeta = {
            fields: [],
          };
          const outputType = getNamedType(typeInfo.getType());
          const cacheKey = getCacheKey(typePolicies, assertObjectType(outputType));
          if (cacheKey) {
            unionType.cacheKey = cacheKey;
          }

          parentFieldDef.possible ??= {};
          parentFieldDef.possible[node.typeCondition?.name.value] = unionType;
          parentStack.push(parentFieldDef);
          parentFieldDef = unionType;
        }
      },
      leave(node) {
        if (node.typeCondition?.name.value && isConcreteAbstract(node, typeInfo, schema)) {
          popStack();
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

function unpackType(typeInfo: TypeInfo) {
  let listDepth = 0;
  // We want to unwrap any list types, and make those the containing
  let gqlType = typeInfo.getType();
  while (isWrappingType(gqlType)) {
    if (isListType(gqlType)) {
      ++listDepth;
    }
    gqlType = gqlType.ofType;
  }
  return { gqlType, listDepth };
}

function isBoringScalar(node: FieldNode, typeInfo: TypeInfo) {
  const { gqlType, listDepth } = unpackType(typeInfo);
  return (
    isScalarType(gqlType) &&
    !listDepth &&
    !node.alias &&
    !node.arguments?.length &&
    !node.directives?.some((d) => d.name.value === 'skip' || d.name.value === 'includes')
  );
}

function noFragments() {
  return new Error('Fragment definitions have been stripped');
}

function isConcreteAbstract(node: InlineFragmentNode, typeInfo: TypeInfo, schema: GraphQLSchema) {
  if (node.typeCondition?.name) {
    const parentTypeName = typeInfo.getParentType()?.name;
    if (node.typeCondition.name.value !== parentTypeName) {
      return isObjectType(schema.getType(node.typeCondition?.name.value));
    }
  }
  return false;
}

function parentIsFieldMeta(parent: FieldMeta | NormalizeMetaShape | UnionMeta): parent is FieldMeta {
  return 'name' in parent;
}
