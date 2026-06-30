// Rolldown bundles src/index.ts and ALL runtime dependencies into a single,
// self-contained dist/index.js that GitHub runs directly at the tagged ref.
// See: https://rolldown.rs
import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    sourcemap: true,
    // A GitHub Action must be one file; never split into chunks.
    codeSplitting: false,
  },
  // Node built-ins stay external; everything in node_modules is bundled so the
  // action needs no `npm install` at runtime.
  external: [/^node:/],
})
