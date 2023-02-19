import { describe, expect, it } from 'vitest'
import { codegen } from '@graphql-codegen/core'
import path from 'path'
import fs from 'fs'

import codegenPlugin from '../src/codegen'
import { schema } from './fixtures/schema'
import { operation1Doc, operation2Doc, operationWithFrag } from './fixtures/ops'
import { parse, printSchema } from 'graphql'

describe('codegen', async () => {
  it('should generate the meta', async () => {
    const filename = path.join(__dirname, 'codegen/out.json')
    const res = await codegen({
      schema: parse(printSchema(schema)),
      documents: [{ document: operation1Doc }, { document: operation2Doc }, { document: operationWithFrag }],
      filename,
      plugins: [
        {
          'graphql-normalize': {},
        },
      ],
      config: {},
      pluginMap: {
        'graphql-normalize': codegenPlugin,
      },
    })
    // fs.writeFileSync(filename, res)
    expect(res).toEqual(fs.readFileSync(filename, 'utf-8'))
  })

  it('should accept an option to stringify the meta', async () => {
    const filename = path.join(__dirname, 'codegen/out-stringify.json')
    const res = await codegen({
      schema: parse(printSchema(schema)),
      documents: [{ document: operation1Doc }, { document: operation2Doc }, { document: operationWithFrag }],
      filename,
      plugins: [
        {
          'graphql-normalize': {
            format: 'stringify',
          },
        },
      ],
      config: {},
      pluginMap: {
        'graphql-normalize': codegenPlugin,
      },
    })
    // fs.writeFileSync(filename, res)
    expect(res).toEqual(fs.readFileSync(filename, 'utf-8'))
  })

  it('should accept an option to base64 the meta', async () => {
    const filename = path.join(__dirname, 'codegen/out-base64.json')
    const res = await codegen({
      schema: parse(printSchema(schema)),
      documents: [{ document: operation1Doc }, { document: operation2Doc }, { document: operationWithFrag }],
      filename,
      plugins: [
        {
          'graphql-normalize': {
            format: 'base64',
          },
        },
      ],
      config: {},
      pluginMap: {
        'graphql-normalize': codegenPlugin,
      },
    })
    // fs.writeFileSync(filename, res)
    expect(res).toEqual(fs.readFileSync(filename, 'utf-8'))
  })
})
