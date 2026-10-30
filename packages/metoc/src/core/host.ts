/**
 * # The map host, by its METOC names
 *
 * The seam an editor or another renderer attaches to is the engine's ({@link MapHost}); these are
 * its names in `@zaes/metoc`.
 */

import type {HostOverlay, MapHost} from '@zaes/symbology-engine';

/** What every renderer offers an editor or overlay: the engine's {@link MapHost}. */
export type MetocMapHost = MapHost;

/** Marks a host draws with its graphics: the engine's {@link HostOverlay}. */
export type MetocOverlay = HostOverlay;
