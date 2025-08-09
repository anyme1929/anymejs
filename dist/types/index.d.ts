import { App } from './app.js';
export { defineConfig } from './utils/index.js';

declare const ready: () => Promise<App>;

export { ready };
