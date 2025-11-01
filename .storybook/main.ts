import type { StorybookConfig } from "@storybook/nextjs-vite";
import type { Plugin } from 'vite';

// Plugin to strip 'use client' directives for Storybook compatibility
const stripUseClientPlugin = (): Plugin => ({
  name: 'strip-use-client',
  transform(code, id) {
    if (id.includes('node_modules')) return null;
    if (!id.endsWith('.tsx') && !id.endsWith('.ts')) return null;

    // Remove 'use client' and 'use server' directives
    const transformed = code
      .replace(/^['"]use client['"]\s*;?\s*/gm, '')
      .replace(/^['"]use server['"]\s*;?\s*/gm, '');

    if (transformed !== code) {
      return { code: transformed, map: null };
    }
    return null;
  },
});

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/nextjs-vite",
    "options": {
      builder: {
        viteConfigPath: undefined,
      }
    }
  },
  "staticDirs": [
    "../public"
  ],
  async viteFinal(config) {
    return {
      ...config,
      plugins: [
        stripUseClientPlugin(),
        ...(config.plugins || []),
      ],
      server: {
        ...config.server,
        fs: {
          ...config.server?.fs,
          strict: false,
        },
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include || []),
          'next-themes',
        ],
      },
    };
  },
};
export default config;