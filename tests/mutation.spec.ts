import { beforeEach, describe, expect, it } from 'vitest'
import { generateNormalizedMetadata } from '../src/codegen/generateNormalizedMetadata'
import { schema } from './fixtures/schema'
import { mutation1Doc, operation3Doc } from './fixtures/ops'
import { NormalizeMetaShape, graphqlNormalize } from '../src'
import { ExecutionResult, execute } from 'graphql'
import { generateNormalizedOperation } from '../src/codegen'
import _ from 'lodash'

describe('mutation', () => {
  let meta: NormalizeMetaShape
  let variableValues = {}
  let result: ExecutionResult
  let cache: Record<string, any>

  beforeEach(async () => {
    meta = generateNormalizedMetadata(schema, operation3Doc)
    variableValues = {}
    result = await execute({
      schema,
      variableValues,
      document: generateNormalizedOperation(schema, operation3Doc),
    })
    cache = {} as const
  })

  it('should generate metadata for a mutation', () => {
    expect(generateNormalizedMetadata(schema, mutation1Doc)).toMatchSnapshot()
  })

  it('syncs the mutation result with the cache', async () => {
    const obj = graphqlNormalize({
      action: 'write',
      meta,
      variableValues,
      operationResult: result,
      cache,
      isEqual: _.isEqual,
      //
    })

    expect({
      added: obj.added,
      modified: obj.modified,
    }).toEqual({ added: 44, modified: 0 })

    expect(cache).toMatchSnapshot()

    const {
      added,
      modified,
      result: result2,
      cache: updatedCache,
    } = graphqlNormalize({
      action: 'write',
      meta: generateNormalizedMetadata(schema, mutation1Doc),
      variableValues,
      operationResult: await execute({
        schema,
        variableValues,
        document: generateNormalizedOperation(schema, mutation1Doc),
      }),
      cache,
      isEqual: _.isEqual,
    })

    expect({ added, modified }).toEqual({ added: 21, modified: 10 })

    expect(updatedCache).toMatchSnapshot()

    expect(result2).toMatchSnapshot()
  })
})
