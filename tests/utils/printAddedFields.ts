import { DocumentNode, visit, print, Kind, OperationDefinitionNode, FieldNode, InlineFragmentNode } from 'graphql'

/**
 * Utility function to print the "diff" of the two documents, removing any
 * fields that exist in both documents
 */
export function printAddedFields(original: DocumentNode, changed: DocumentNode) {
  const fieldPath: string[] = []
  return print(
    visit(changed, {
      InlineFragment: {
        enter(node) {
          if (node.typeCondition?.name) {
            fieldPath.push(`$${node.typeCondition.name.value}`)
          }
        },
        leave(node) {
          fieldPath.pop()
          if (node.selectionSet.selections.length === 0) {
            return null
          }
        },
      },
      Field: {
        enter(node) {
          fieldPath.push(node.alias?.value ?? node.name.value)
        },
        leave(node) {
          if (!node.selectionSet) {
            let currentPath = [...fieldPath]
            let target = original.definitions[0] as OperationDefinitionNode | FieldNode | InlineFragmentNode | undefined
            while (currentPath.length) {
              const current = currentPath.shift()
              target = target?.selectionSet?.selections.find((s): s is FieldNode | InlineFragmentNode => {
                if (current?.startsWith('$')) {
                  return s.kind === Kind.INLINE_FRAGMENT && s.typeCondition?.name.value === current.slice(1)
                }
                return s.kind === Kind.FIELD && (s.alias?.value === current || s.name.value === current)
              })
            }

            if (target) {
              fieldPath.pop()
              return null
            }
          }
          fieldPath.pop()
        },
      },
    })
  )
}
