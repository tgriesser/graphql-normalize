import type { PluginFunction } from '@graphql-codegen/plugin-helpers'
import type { DocumentNode } from 'graphql'
import { generateNormalizedOperations } from './generateNormalizedOperation'
import { generateNormalizedMetadataForDocs } from './generateNormalizedMetadata'
import type { NormalizeMetaShape } from '../metadataShapes'

const VALID_FORMATS = ['base64', 'stringify', 'json'] as const

export const NormalizeCodegenPlugin: PluginFunction<{
  format?: (typeof VALID_FORMATS)[number]
  defaultKeys?: string[]
  typeKeys?: Record<string, string | string[] | null>
}> = (schema, documents, config, info) => {
  const documentNodes = documents.map((d) => d.document).filter((d): d is DocumentNode => Boolean(d))
  const typePolicies = {
    defaultKeys: config.defaultKeys,
    typeKeys: config.typeKeys,
  }
  if (config.format && !VALID_FORMATS.includes(config.format)) {
    throw new Error(`Invalid format option provided, expected one of ${VALID_FORMATS}`)
  }
  const ops = generateNormalizedOperations(schema, documentNodes, typePolicies)
  const normalizedMeta = generateNormalizedMetadataForDocs(schema, ops, typePolicies)
  const toPrint: Record<string, NormalizeMetaShape | string> = {}
  for (const { name, meta } of normalizedMeta) {
    if (config.format && config.format !== 'json') {
      const jsonString = JSON.stringify(meta)
      toPrint[name] = config.format === 'base64' ? Buffer.from(jsonString, 'utf-8').toString('base64') : jsonString
    } else {
      toPrint[name] = meta
    }
  }
  return JSON.stringify(toPrint, null, 2)
}
