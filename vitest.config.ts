import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    deps: {
      // Due to issue with GraphQL mjs import, should be fixed in ^17
      fallbackCJS: true,
    },
    coverage: {
      provider: 'c8',
    },
  },
});
