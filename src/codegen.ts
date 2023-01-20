import { NormalizeCodegenPlugin } from './codegen/plugin.js';
export type { TypePolicies } from './codegen/getCacheKey.js';
export type { NormalizeMetaShape, NormalizedDocShape } from './metadataShapes.js';

export { NormalizeCodegenPlugin } from './codegen/plugin.js';
export { generateNormalizedMetadataForDocs, generateNormalizedMetadata } from './codegen/generateNormalizedMetadata.js';
export { generateNormalizedOperations, generateNormalizedOperation } from './codegen/generateNormalizedOperation.js';

export { NormalizeCodegenPlugin as plugin };

export default {
  plugin: NormalizeCodegenPlugin,
};
