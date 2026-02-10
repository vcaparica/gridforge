import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal: (config) => {
    // Use a temp-dir cache to avoid Dropbox/WSL2 file-locking issues
    config.cacheDir = join(tmpdir(), 'gridforge-storybook-vite-cache');
    return config;
  },
};

export default config;
