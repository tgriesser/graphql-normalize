import { NormalizeCodegenPlugin } from './codegen/plugin.js';
export type { TypePolicies } from './codegen/getCacheKey.js';
export type { NormalizeMetaShape, NormalizedDocShape } from './metadataShapes.js';

export { NormalizeCodegenPlugin } from './codegen/plugin.js';
export { generateNormalizedMetadataForDocs, generateNormalizedMetadata } from './codegen/generateNormalizedMetadata.js';
export { generateNormalizedOperations, generateNormalizedOperation } from './codegen/generateNormalizedOperation.js';

export default NormalizeCodegenPlugin;

// GraphQL Codegen expects CJS exports
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = exports.default;
}
