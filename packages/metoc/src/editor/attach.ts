/**
 * # Attaching the editor to a map
 *
 * `attachMetocEditor(host, editor)` is the whole integration: any renderer that implements
 * {@link MetocMapHost} — OpenLayers, MapLibre or any other — gets drawing and editing, with no editing
 * code of its own. It is `@zaes/symbology-editor`'s `attachEditor`, by its METOC name.
 */

import type {MetocMapHost} from '../index.js';
import {attachEditor} from '@zaes/symbology-editor';
import type {MetocInteraction} from './interaction.js';

export {editorOverlay} from '@zaes/symbology-editor';

/**
 * Edit on a map. Returns the function that detaches: the host's events stop reaching the editor
 * and its overlay is cleared. The editor itself, its collection and its selection survive, so a
 * host can switch engines and attach the same editor to the next one.
 */
export function attachMetocEditor(host: MetocMapHost, editor: MetocInteraction): () => void {
    return attachEditor(host, editor);
}
