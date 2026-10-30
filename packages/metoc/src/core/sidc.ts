/**
 * # Symbol identification codes
 *
 * MIL-STD-2525E Change 1, Appendix A, Figure A-1: thirty digits in three sets of ten.
 *
 * | Positions | Field | METOC value |
 * |---|---|---|
 * | 1–2 | Version | `15` — MIL-STD-2525E(1), Table A-I |
 * | 3–4 | Context and standard identity | `00` — "Standard Identity is not applicable to METOC symbols" (5.2) |
 * | 5–6 | Symbol set | `45` Atmospheric, `46` Oceanographic |
 * | 7 | Status | `0` present |
 * | 8 | HQ / task force / dummy | `0` |
 * | 9–10 | Amplifying descriptor | `00` |
 * | 11–16 | Entity, type, subtype | the catalog's entity code |
 * | 17–20 | Modifiers 1 and 2 | `0000` |
 * | 21–30 | Set C | zeros |
 */

import {MetocGraphicName, getMetocSpec, metocGraphicByEntityCode} from './catalog.js';

/** MIL-STD-2525E(1), Table A-I. */
export const SIDC_VERSION_2525E_CHANGE_1 = '15';

/**
 * The 30-digit SIDC for a graphic, or `undefined` for one the standard gives no entity code (the
 * wind barb). Never a made-up code: a SIDC another system cannot read back is worse than none.
 */
export function metocSidc(name: MetocGraphicName): string | undefined {
    const s = getMetocSpec(name);
    if (s.entityCode === null) return undefined;
    return `${SIDC_VERSION_2525E_CHANGE_1}00${s.symbolSet}0000${s.entityCode}0000${'0'.repeat(10)}`;
}

/**
 * The graphic a SIDC names, or `undefined`. Accepts the 20-digit 2525D form and the 30-digit
 * 2525E form, any version, and ignores the identity and modifier positions: a METOC line is
 * named by its symbol set and entity code alone.
 */
export function metocGraphicFromSidc(sidc: string): MetocGraphicName | undefined {
    const digits = sidc.trim();
    if (!/^\d{20}(\d{10})?$/.test(digits)) return undefined;
    const set = digits.slice(4, 6);
    if (set !== '45' && set !== '46') return undefined;
    return metocGraphicByEntityCode(digits.slice(10, 16), Number(set) as 45 | 46);
}
