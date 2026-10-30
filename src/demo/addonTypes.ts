/**
 * # Engines and tools the sample page can borrow from outside this repository
 *
 * The page offers OpenLayers and MapLibre. A separately licensed add-on can add an engine, or a
 * tool that works on whatever the map is showing, **on a developer's machine only**:
 * `npm run start:addons` starts Vite in its `addons` mode, which loads the Vite plugins listed in
 * the untracked `demo-addons.local.json`. Each plugin names its entry module (`demoAddonEntry`),
 * and `@demo/addons` joins every entry's `demoAddons` (engines) and `demoTools`. Everywhere else,
 * including every build and so the published sample, `@demo/addons` is `addonsNone.ts` and both
 * lists are empty; `vite.config.mts` refuses to build in `addons` mode, and
 * `scripts/check-free-demo.mjs` checks the build.
 *
 * Nothing about any particular add-on belongs in this repository: an add-on's code, its markup and
 * its styles stay in the add-on. An add-on's demo code reaches this page's modules as `@metoc-demo/*`.
 */

import type {MetocCollection} from '@zaes/metoc';
import type {EngineHandle, ViewState} from './engines';

export type {EngineCamera, EngineHandle, ViewState} from './engines';

/** A map engine the page's engine switch offers beside its own. */
export interface DemoAddonEngine {
    /** Stored in localStorage as the chosen engine, so keep it stable. */
    id: string;
    /** The switch's label. */
    label: string;
    /** A name from the page's icon set (`icons.ts`). */
    icon?: string;
    /** Load it lazily: the page should not pull an engine in until it is chosen. */
    create(target: HTMLElement, collection: MetocCollection, state: ViewState, basemapOpacity: number, dark: boolean, leaderLines: boolean): Promise<EngineHandle>;
}

/** What a tool is given: the graphics, the live view, and where to put its controls. */
export interface DemoToolContext {
    collection: MetocCollection;
    /** The current view's resolution, in projected meters a pixel. */
    resolution(): number;
    status(text: string): void;
    download(data: BlobPart, type: string, file: string): void;
    /** Where the tool's toolbar buttons go. */
    toolbar: HTMLElement;
    /** Where the tool's panels go, beside Settings. */
    panels: HTMLElement;
}

/** Something done to the graphics on the map, whichever engine shows them. */
export interface DemoAddonTool {
    id: string;
    mount(context: DemoToolContext): void;
}
