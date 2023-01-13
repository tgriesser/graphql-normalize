import type { CodegenPlugin } from '@graphql-codegen/plugin-helpers';

export { generateNormalizedMetadata } from './codegen/generateNormalizedMetadata.js';
export { generateNormalizedOperation } from './codegen/generateNormalizedOperation.js';

const NormalizeCodegenPlugin: CodegenPlugin = {
  plugin(schema, documents, config, info) {
    return '';
  },
};

export default NormalizeCodegenPlugin;
