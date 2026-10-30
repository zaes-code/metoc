import {MetocGraphicName as N, getMetocSpec, listMetocGraphics} from '../index.js';
import {METOC_VALUE_FIELDS, getMetocFields} from './fields';

describe('the field registry', () => {
    it('offers a value field exactly where the catalog gives the graphic one, worded', () => {
        for (const n of listMetocGraphics()) {
            expect(getMetocFields(n).value).toEqual(getMetocSpec(n).valueField ?? null);
            if (METOC_VALUE_FIELDS[n]) expect(METOC_VALUE_FIELDS[n]!.label.length).toBeGreaterThan(0);
        }
    });

    it('offers the date-time label on the tropical storm wind area alone', () => {
        expect(listMetocGraphics().filter((n) => getMetocFields(n).dtg)).toEqual([N.TropicalStormWindArea]);
    });

    it('offers the fill on Area2 graphics alone', () => {
        for (const n of listMetocGraphics()) expect(getMetocFields(n).filled).toBe(getMetocSpec(n).drawRule === 'Area2');
    });

    it('offers a colour only where the standard leaves it to the operator', () => {
        expect(getMetocFields(N.ColdFront).color).toBeNull();
        expect(getMetocFields(N.StreamLine).color).toBe('any');
        expect(getMetocFields(N.JetStream).color).toEqual(['warm', 'black']);
        expect(getMetocFields(N.TropicalStormWindArea).color).toEqual(['warm', 'isotach', 'black']);
    });

    it('offers dashing on the operator-defined graphics alone', () => {
        expect(listMetocGraphics().filter((n) => getMetocFields(n).dashed).sort()).toEqual(
            [N.OperatorDefinedFreeformArea, N.OperatorDefinedFreeformLine, N.OperatorDefinedMaritimeArea].sort(),
        );
    });
});
