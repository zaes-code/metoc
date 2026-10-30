import type {DemoAddonEngine, DemoAddonTool} from './addonTypes';

/** What `@demo/addons` is everywhere but a developer's `npm run start:addons`: no engines, no tools. @see addonTypes.ts */
export const demoAddons: readonly DemoAddonEngine[] = [];
export const demoTools: readonly DemoAddonTool[] = [];
