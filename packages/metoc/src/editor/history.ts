/**
 * # Undo and redo, for METOC
 *
 * `@zaes/symbology-editor`'s {@link SymbolHistory} on a {@link MetocCollection}: snapshots of the
 * saved form, taken at checkpoints — the editor's `commit` at the end of a gesture, and a settled
 * properties edit — so a drag is one step and a checkpoint that changes nothing records nothing.
 */

import type {MetocCollection} from '../index.js';
import {SymbolHistory} from '@zaes/symbology-editor';

export type {HistoryListener} from '@zaes/symbology-editor';

export class MetocHistory extends SymbolHistory {
    constructor(collection: MetocCollection, /** How many steps back to keep. */ limit = 100) {
        super(collection, limit);
    }
}
