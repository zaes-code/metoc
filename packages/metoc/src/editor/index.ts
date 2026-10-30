/**
 * # @zaes/metoc/editor
 *
 * Drawing and editing for `@zaes/metoc`: the editor, undo and redo, and the field list a
 * properties dialog reads. The gestures and undo are `@zaes/symbology-editor`'s, bound here to
 * METOC ({@link METOC_EDITING}); the field registry is METOC's own. It works on any map that
 * implements `MetocMapHost`, such as the OpenLayers and MapLibre renderers in `@zaes/metoc`, through
 * {@link attachMetocEditor}, and imports no map library itself. The root entry never imports it.
 *
 * @module @zaes/metoc/editor
 */

export {HANDLE_RADIUS_PX, HIT_TOLERANCE_PX, INSERT_HANDLE_RADIUS_PX, METOC_EDITING, MetocInteraction} from './interaction.js';
export type {EditMode, EditorAction, EditorListener, EditorOverlay, HandleMark, MetocEditorChange, MetocEditorOptions, Pixel, PointerInput, ViewAdapter} from './interaction.js';
export {attachMetocEditor, editorOverlay} from './attach.js';
export {MetocHistory} from './history.js';
export type {HistoryListener} from './history.js';
export {METOC_COLOR_ROLE_NAMES, METOC_VALUE_FIELDS, getMetocFields, stationChoices} from './fields.js';
export type {MetocFieldSet} from './fields.js';
