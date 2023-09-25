import { defineConfig } from 'unocss';

export default defineConfig({
  // ...UnoCSS options
  content: {
    filesystem: ['packages/renderer/src/**/*.vue', 'packages/renderer/index.html'],
  },
});
