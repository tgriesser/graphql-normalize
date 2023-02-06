import { ExecutionResult, execute } from 'graphql'
import { beforeEach, describe, expect, it } from 'vitest'
import _ from 'lodash'

import { generateNormalizedOperation, generateNormalizedMetadata } from '../src/codegen'
import { schema } from './fixtures/schema'
import { operation1Doc } from './fixtures/ops'
import { graphqlNormalize } from '../src/graphqlNormalize'
import type { NormalizeMetaShape } from '../src/metadataShapes'
import { enablePatches, produceWithPatches } from 'immer'

enablePatches()

describe('syncWithCache', () => {
  let meta: NormalizeMetaShape
  let variableValues = {}
  let result: ExecutionResult
  let cache: Record<string, any>

  beforeEach(async () => {
    meta = generateNormalizedMetadata(schema, operation1Doc)
    variableValues = {}
    result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation1Doc),
    })
    cache = {} as const
  })

  it('syncs the query result with the cache', async () => {
    const obj = graphqlNormalize({
      action: 'write',
      meta,
      variableValues,
      operationResult: result,
      cache,
      isEqual: _.isEqual,
      //
    })

    expect(cache).toMatchSnapshot()
    expect(obj).toMatchSnapshot()

    const obj2 = graphqlNormalize({
      action: 'write',
      meta,
      variableValues,
      operationResult: result,
      currentResult: obj.result,
      cache,
      isEqual: _.isEqual,
    })

    expect({
      added: obj2.added,
      modified: obj2.modified,
    }).toMatchInlineSnapshot(`
      {
        "added": 0,
        "modified": 0,
      }
    `)
  })

  it('writes additional values into the store when the variables are changed', async () => {
    const { result: currentResult } = graphqlNormalize({
      action: 'write',
      meta,
      variableValues,
      operationResult: result,
      cache,
      isEqual: _.isEqual,
      //
    })

    const variableValues2 = { hasNode: true, nodeId: 'VXNlcjox' }

    const [, patches] = await produceWithPatches({ cache, currentResult }, async ({ cache, currentResult }) => {
      const sync2 = graphqlNormalize({
        action: 'write',
        meta,
        variableValues: variableValues2,
        currentResult,
        operationResult: await execute({
          schema,
          variableValues: variableValues2,
          contextValue: {},
          document: generateNormalizedOperation(schema, operation1Doc),
        }),
        cache,
        isEqual: _.isEqual,
      })

      // Only added a single item to the cache, since we already have this object.
      expect(sync2.added).toEqual(2)
      expect(sync2.modified).toEqual(0)
    })

    expect(patches).toMatchSnapshot()
  })

  it('removes unused keys when keys dissapear', async () => {
    const variableValues = { hasNode: true, nodeId: 'VXNlcjox' }

    const { result: currentResult } = graphqlNormalize({
      action: 'write',
      meta,
      variableValues,
      operationResult: await execute({
        schema,
        variableValues,
        contextValue: {},
        document: generateNormalizedOperation(schema, operation1Doc),
      }),
      cache,
      isEqual: _.isEqual,
      //
    })

    const [, patches] = await produceWithPatches({ cache, currentResult }, async ({ cache, currentResult }) => {
      graphqlNormalize({
        action: 'write',
        meta,
        variableValues: {},
        currentResult,
        operationResult: await execute({
          schema,
          variableValues,
          contextValue: {},
          document: generateNormalizedOperation(schema, operation1Doc),
        }),
        cache,
        isEqual: _.isEqual,
      })
    })

    expect(patches).toMatchSnapshot()
  })
})
