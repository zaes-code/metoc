import {describe, expect, it} from 'vitest';

/**
 * Every run-time export of each published entry, by name. This is the package's public API: a
 * change here is a change for every consumer, so adding or removing a name means updating this list
 * on purpose (and the version).
 */
describe('the public API', () => {
    it('@zaes/metoc', async () => {
        expect(Object.keys(await import('@zaes/metoc')).sort()).toEqual([
            'DEFAULT_METOC_PALETTE', 'METOC_CONFIG_RANGES', 'METOC_DARK_MAP', 'METOC_GRAPHICS', 'METOC_LIGHT_MAP', 'METOC_PAINTER', 'METOC_SCHEMA', 'MetocCategory', 'MetocCollection',
            'MetocGraphicName', 'POINT_SIZES', 'SIDC_VERSION_2525E_CHANGE_1', 'WORLD_WIDTH', 'colorOf', 'configureMetoc', 'continuousLonLat',
            'drawnPoints', 'flipMetocFeature', 'fromMercator', 'getDefaultLineColor', 'getMetocConfig', 'getMetocDisplayName', 'getMetocSpec',
            'isMetocGraphicName', 'isPointSize', 'listMetocGraphics', 'metocFeature', 'metocGraphicByEntityCode',
            'metocGraphicFromSidc', 'metocSidc', 'metocThumbnailSvg', 'minimumPoints', 'nearestWorldX', 'paintMetocGraphic',
            'paintMetocGraphicAsGeoJSON', 'pointClicks', 'renderMetocGraphic', 'resetMetocConfig', 'toMercator', 'validateMetocFeature',
            'withDrawnPoints', 'wrapLongitude',
        ]);
    });

    it('its renderers and its editor', async () => {
        expect(Object.keys(await import('@zaes/metoc/openlayers')).sort()).toEqual(['MetocOpenLayers', 'paintsToStyles']);
        expect(Object.keys(await import('@zaes/metoc/maplibre')).sort()).toEqual(['MetocMapLibre', 'paintsToMapLibreFeatures']);
        expect(Object.keys(await import('@zaes/metoc/editor')).sort()).toEqual([
            'HANDLE_RADIUS_PX', 'HIT_TOLERANCE_PX', 'INSERT_HANDLE_RADIUS_PX', 'METOC_COLOR_ROLE_NAMES', 'METOC_EDITING', 'METOC_VALUE_FIELDS',
            'MetocHistory', 'MetocInteraction', 'attachMetocEditor', 'editorOverlay', 'getMetocFields', 'stationChoices',
        ]);
    });
});
