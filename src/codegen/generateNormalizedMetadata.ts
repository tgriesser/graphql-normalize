import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer'
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
  isEnumType,
} from 'graphql'
import type {
  FieldDef,
  FieldMeta,
  NormalizeMetaShape,
  NormalizedDocShape,
  UnionMeta,
  VariableMeta,
} from '../metadataShapes'
import { TypePolicies, getCacheKey } from './getCacheKey'
import { stringifyVariables } from '../stringifyVariables'

export function generateNormalizedMetadata(
  schema: GraphQLSchema,
  document: DocumentNode,
  typePolicies: TypePolicies = {}
) {
  return generateNormalizedMetadataForDocs(schema, [document], typePolicies)[0].meta
}

/**
 * Given an operation and a schema, generates the metadata necessary to
 * write the operation into the cache
 */
export function generateNormalizedMetadataForDocs(
  schema: GraphQLSchema,
  documents: DocumentNode[],
  typePolicies: TypePolicies = {}
): NormalizedDocShape[] {
  let finalDocuments = documents
  if (documents.some((o) => o.definitions.some((d) => d.kind === Kind.FRAGMENT_DEFINITION))) {
    finalDocuments = optimizeDocuments(schema, documents, {
      noLocation: true,
      includeFragments: false,
    })
  }

  const normalizedDocs: NormalizedDocShape[] = []

  const typeInfo = new TypeInfo(schema)
  let normalizedDoc: NormalizeMetaShape = {
    operation: OperationTypeNode.QUERY,
    variables: [],
    fields: [],
  }

  let parentStack: Array<FieldMeta | UnionMeta | NormalizeMetaShape> = []
  let parentFieldDef: FieldMeta | NormalizeMetaShape | UnionMeta = normalizedDoc

  function popStack() {
    const parent = parentStack.pop()
    if (parent) {
      parentFieldDef = parent
    }
  }

  function pushField(field: string | FieldDef) {
    parentFieldDef.fields ??= []
    if (typeof field === 'string' && parentFieldDef.fields.includes(field)) {
      return
    }
    parentFieldDef.fields.push(field)
    if (typeof field !== 'string') {
      parentStack.push(parentFieldDef)
      parentFieldDef = field
    }
  }

  function normalizeArgs(nodes: readonly ArgumentNode[]) {
    let hasVar = false
    const argsDef: Record<string, any> = {}
    for (const arg of nodes) {
      if (arg.value.kind === Kind.VARIABLE) {
        argsDef[`$${arg.value.name.value}`] = arg.name.value
        hasVar = true
      } else {
        argsDef[arg.name.value] = print(arg.value)
      }
    }
    return hasVar ? argsDef : stringifyVariables(argsDef)
  }

  const visitor = visitWithTypeInfo(typeInfo, {
    OperationDefinition: {
      enter(op) {
        normalizedDoc.operation = op.operation
      },
      leave(op) {
        normalizedDocs.push({
          name: op.name?.value ?? 'unnamed',
          meta: normalizedDoc,
        })
        normalizedDoc = {
          operation: OperationTypeNode.QUERY,
          variables: [],
          fields: [],
        }
        parentFieldDef = normalizedDoc
        parentStack = []
      },
    },
    VariableDefinition(node) {
      const obj: VariableMeta = {
        name: node.variable.name.value,
      }
      if (node.defaultValue) {
        obj.defaultValue = print(node.defaultValue)
      }
      normalizedDoc.variables.push(obj)
    },
    Field: {
      enter(node) {
        const { gqlType, listDepth } = unpackType(typeInfo)

        // If this is a boring ol scalar / enum, we push it as a string
        if (isSimpleField(node, typeInfo)) {
          pushField(node.name.value)
          return
        }

        const fieldMeta: FieldMeta = { name: node.name.value }
        pushField(fieldMeta)

        if (listDepth) fieldMeta.list = listDepth
        if (node.alias?.value) fieldMeta.alias = node.alias.value

        if (isObjectType(gqlType)) {
          const cacheKey = getCacheKey(typePolicies, gqlType)
          if (cacheKey) {
            fieldMeta.cacheKey = cacheKey
          }
          if (gqlType.name === schema.getQueryType()?.name) {
            fieldMeta.cacheKey = '$root'
          }
        }
        if (node.arguments?.length) {
          fieldMeta.args = normalizeArgs(node.arguments)
        }

        const skipDirective = node.directives?.find((d) => d.name.value === 'skip')
        const includeDirective = node.directives?.find((d) => d.name.value === 'include')
        if (skipDirective) {
          fieldMeta.skip = normalizeArgs(skipDirective.arguments ?? [])
        }
        if (includeDirective) {
          fieldMeta.include = normalizeArgs(includeDirective.arguments ?? [])
        }
      },
      leave(node) {
        // Pop things back into place
        if (!isSimpleField(node, typeInfo)) {
          popStack()
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
          }
          const outputType = getNamedType(typeInfo.getType())
          const cacheKey = getCacheKey(typePolicies, assertObjectType(outputType))
          if (cacheKey) {
            unionType.cacheKey = cacheKey
          }

          parentFieldDef.possible ??= {}
          parentFieldDef.possible[node.typeCondition?.name.value] = unionType
          parentStack.push(parentFieldDef)
          parentFieldDef = unionType
        }
      },
      leave(node) {
        if (node.typeCondition?.name.value && isConcreteAbstract(node, typeInfo, schema)) {
          popStack()
        }
      },
    },
    FragmentDefinition() {
      throw noFragments()
    },
  })

  for (const doc of finalDocuments) {
    visit(doc, visitor)
  }

  return normalizedDocs
}

function unpackType(typeInfo: TypeInfo) {
  let listDepth = 0
  // We want to unwrap any list types, and make those the containing
  let gqlType = typeInfo.getType()
  while (isWrappingType(gqlType)) {
    if (isListType(gqlType)) {
      ++listDepth
    }
    gqlType = gqlType.ofType
  }
  return { gqlType, listDepth }
}

function isSimpleField(node: FieldNode, typeInfo: TypeInfo) {
  const { gqlType, listDepth } = unpackType(typeInfo)
  return (
    (isScalarType(gqlType) || isEnumType(gqlType)) &&
    !listDepth &&
    !node.alias &&
    !node.arguments?.length &&
    !node.directives?.some((d) => d.name.value === 'skip' || d.name.value === 'includes')
  )
}

function noFragments() {
  return new Error('Fragment definitions have been stripped')
}

function isConcreteAbstract(node: InlineFragmentNode, typeInfo: TypeInfo, schema: GraphQLSchema) {
  if (node.typeCondition?.name) {
    const parentTypeName = typeInfo.getParentType()?.name
    if (node.typeCondition.name.value !== parentTypeName) {
      return isObjectType(schema.getType(node.typeCondition?.name.value))
    }
  }
  return false
}

function parentIsFieldMeta(parent: FieldMeta | NormalizeMetaShape | UnionMeta): parent is FieldMeta {
  return 'name' in parent
}
