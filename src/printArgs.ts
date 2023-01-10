import { NO_ARGS } from './constants';
import type { ArgDef, NormalizeMetaShape } from './metadataShapes';
import { stringifyVariables } from './stringifyVariables';

function getArgValue(key: string, meta: NormalizeMetaShape, variableValues: any) {
  return variableValues[key] ?? meta.variables.find((k) => k.name === key)?.defaultValue;
}

export function printArgs(args: string | ArgDef | undefined, meta: NormalizeMetaShape, variableValues: any) {
  if (args === undefined) return NO_ARGS;
  if (typeof args === 'string') return args;
  const argsObj: Record<string, any> = {};
  for (const key of Object.keys(args).sort()) {
    if (key.startsWith('$')) {
      argsObj[args[key]] = getArgValue(key.slice(1), meta, variableValues);
    }
  }
  return stringifyVariables(argsObj);
}
