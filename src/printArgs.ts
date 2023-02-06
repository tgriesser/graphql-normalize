import { NO_ARGS } from './constants.js'
import type { ArgDef, NormalizeMetaShape } from './metadataShapes.js'
import { stringifyVariables } from './stringifyVariables.js'

function getArgValue(key: string, meta: NormalizeMetaShape, variableValues: any) {
  return variableValues[key] ?? meta.variables.find((k) => k.name === key)?.defaultValue
}

export function getArgsObj(args: string | ArgDef | undefined, meta: NormalizeMetaShape, variableValues: any) {
  if (!args) {
    return {}
  }
  const argsObj: Record<string, any> = {}
  if (typeof args === 'string') {
    const parsedArgs = JSON.parse(args)
    for (const key of Object.keys(parsedArgs).sort()) {
      argsObj[key] = JSON.parse(parsedArgs[key])
    }
  } else {
    for (const key of Object.keys(args).sort()) {
      if (key.startsWith('$')) {
        argsObj[args[key]] = JSON.parse(getArgValue(key.slice(1), meta, variableValues))
      }
    }
  }
  return argsObj
}

export function printArgs(args: string | ArgDef | undefined, meta: NormalizeMetaShape, variableValues: any) {
  if (args === undefined) return NO_ARGS
  if (typeof args === 'string') return args
  const argsObj: Record<string, any> = {}
  for (const key of Object.keys(args).sort()) {
    if (key.startsWith('$')) {
      argsObj[args[key]] = getArgValue(key.slice(1), meta, variableValues)
    }
  }
  return stringifyVariables(argsObj)
}
