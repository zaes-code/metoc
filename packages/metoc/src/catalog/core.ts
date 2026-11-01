/**
 * The graphics with painters of their own: pressure centres, fronts, pressure lines, winds,
 * isopleths and the areas of weather (symbol set 45). Each entry follows Table A-LI and Table
 * M-II; see `catalog.ts` for what an entry holds.
 */

import {MetocCategory, metocSpec, type MetocValueField} from '../core/specTypes.js';

const v = (label: string, placeholder: string): MetocValueField => ({label, placeholder});

const C = MetocCategory.PressureCenters;
const F = MetocCategory.Fronts;
const P = MetocCategory.PressureLines;
const W = MetocCategory.Winds;
const I = MetocCategory.Isopleths;
const A = MetocCategory.Areas;

export const CORE_SPECS = [

    // Pressure centres (Table M-II, Point1). L and H carry the central pressure as a "dynamic tag
    // P" below the letter; the tropopause boxes carry a height in hundreds of feet.
    metocSpec('LowPressureCenter', 'Low Pressure Center', C, 45, '110100', 'Point1', ['warm'], {valueField: v('Central pressure (hPa)', '998')}),
    metocSpec('CycloneCenter', 'Cyclone Center', C, 45, '110101', 'Point1', ['warm']),
    metocSpec('TropopauseLow', 'Tropopause Low', C, 45, '110102', 'Point1', ['black'], {valueField: v('Height (hundreds of ft)', '270')}),
    metocSpec('HighPressureCenter', 'High Pressure Center', C, 45, '110200', 'Point1', ['cold'], {valueField: v('Central pressure (hPa)', '1016')}),
    metocSpec('AnticycloneCenter', 'Anticyclone Center', C, 45, '110201', 'Point1', ['cold']),
    metocSpec('TropopauseHigh', 'Tropopause High', C, 45, '110202', 'Point1', ['black'], {valueField: v('Height (hundreds of ft)', '460')}),
    metocSpec('ColdFront', 'Cold Front', F, 45, '110301', 'Line1', ['cold']),
    metocSpec('UpperColdFront', 'Upper Cold Front', F, 45, '110302', 'Line1', ['cold']),
    metocSpec('ColdFrontogenesis', 'Cold Frontogenesis', F, 45, '110303', 'Line1', ['cold']),
    metocSpec('ColdFrontolysis', 'Cold Frontolysis', F, 45, '110304', 'Line1', ['cold']),
    metocSpec('WarmFront', 'Warm Front', F, 45, '110305', 'Line1', ['warm']),
    metocSpec('UpperWarmFront', 'Upper Warm Front', F, 45, '110306', 'Line1', ['warm']),
    metocSpec('WarmFrontogenesis', 'Warm Frontogenesis', F, 45, '110307', 'Line1', ['warm']),
    metocSpec('WarmFrontolysis', 'Warm Frontolysis', F, 45, '110308', 'Line1', ['warm']),
    metocSpec('OccludedFront', 'Occluded Front', F, 45, '110309', 'Line1', ['occluded']),
    metocSpec('UpperOccludedFront', 'Upper Occluded Front', F, 45, '110310', 'Line1', ['occluded']),
    metocSpec('OccludedFrontolysis', 'Occluded Frontolysis', F, 45, '110311', 'Line1', ['occluded']),
    metocSpec('StationaryFront', 'Stationary Front', F, 45, '110312', 'Line1', ['warm', 'cold']),
    metocSpec('UpperStationaryFront', 'Upper Stationary Front', F, 45, '110313', 'Line1', ['warm', 'cold']),
    metocSpec('StationaryFrontogenesis', 'Stationary Frontogenesis', F, 45, '110314', 'Line1', ['warm', 'cold']),
    metocSpec('StationaryFrontolysis', 'Stationary Frontolysis', F, 45, '110315', 'Line1', ['warm', 'cold']),
    metocSpec('TroughAxis', 'Trough Axis', P, 45, '110401', 'Line1', ['black']),
    metocSpec('Trough', 'Trough', P, 45, '110402', 'Line1', ['black']),
    metocSpec('RidgeAxis', 'Ridge Axis', P, 45, '110403', 'Line1', ['black']),
    metocSpec('SevereSquallLine', 'Severe Squall Line', P, 45, '110404', 'Line2', ['black']),
    metocSpec('InstabilityLine', 'Instability Line', P, 45, '110405', 'Line3', ['black']),
    metocSpec('ShearLine', 'Shear Line', P, 45, '110406', 'Line4', ['black']),
    // Table A-LI renders it as a Line, but its draw rule, Table M-I Line5, asks for "at least three
    // anchor points to define the boundary of the area", with "dual line segments ... parallel to
    // slightly wider at the western end". The rule is the drawing, so it is traced as an area.
    metocSpec('InterTropicalConvergenceZone', 'Inter-Tropical Convergence Zone', P, 45, '110407', 'Line5', ['convergence'], {
        geometry: 'area',
    }),
    metocSpec('ConvergenceLine', 'Convergence Line', P, 45, '110408', 'Line6', ['convergence']),
    metocSpec('InterTropicalDiscontinuity', 'Inter-Tropical Discontinuity', P, 45, '110409', 'Line7', [
        'warm',
        'discontinuityGreen',
    ]),
    metocSpec('CalmWinds', 'Calm Winds', W, 45, '140100', 'Point4', ['black']),
    // Table M-I's wind-barb rule; Table A-LI has no entity for it (see entityCode).
    metocSpec('WindBarb', 'Wind Barb', W, 45, null, 'Point5', ['black'], {directional: true}),
    // A station plot: Appendix M's pieces around one station, in the WMO/NWS station model layout.
    // Table A-LI has no entity for it either; the standard places only some of the pieces (the
    // barb from the plot circle, the pressure tendency to its right), so the rest follow the model.
    metocSpec('StationPlot', 'Station Plot', W, 45, null, 'Point5', ['black'], {
        directional: true,
        note: 'Not an entity in Table A-LI: a composite of Appendix M symbols (cloud cover in the plot circle, the wind barb from it, present weather, pressure tendency) and values (temperature, dew point, pressure, pressure change), laid out as the WMO and NWS station model. Table M-II places the barb on the plot circle and the tendency to its right; the rest follow the model.',
    }),
    metocSpec('JetStream', 'Jet Stream', W, 45, '140300', 'Line1', ['warm'], {operatorColor: ['warm', 'black']}),
    metocSpec('StreamLine', 'Stream Line', W, 45, '140400', 'Line1', ['black'], {operatorColor: true}),
    metocSpec('IsobarSurface', 'Isobar - Surface', I, 45, '180100', 'Line1', ['black'], {valueField: v('Pressure (hPa)', '1012')}),
    metocSpec('ContourUpperAir', 'Contour - Upper Air', I, 45, '180200', 'Line1', ['black'], {valueField: v('Height (dam)', '564')}),
    metocSpec('Isotherm', 'Isotherm', I, 45, '180300', 'Line1', ['warm'], {valueField: v('Temperature (°C)', '-10')}),
    metocSpec('Isotach', 'Isotach', I, 45, '180400', 'Line1', ['isotach'], {valueField: v('Wind speed (kt)', '50')}),
    metocSpec('Isodrosotherm', 'Isodrosotherm', I, 45, '180500', 'Line1', ['isodrosotherm'], {valueField: v('Dew point (°C)', '15')}),
    metocSpec('Thickness', 'Thickness', I, 45, '180600', 'Line1', ['warm'], {valueField: v('Thickness (dam)', '540')}),
    metocSpec('OperatorDefinedFreeformLine', 'Operator-Defined Freeform Line', I, 45, '180700', 'Line1', ['black'], {
        valueField: v('Label', 'Value'),
        operatorColor: true,
        operatorDash: true,
    }),
    // Areas. Table M-II prints no RGB for green or yellow on these rows, and brown only on the icing
    // rows; the palette holds them.
    metocSpec('TropicalStormWindArea', 'Tropical Storm Wind Areas and Date/Time Labels', A, 45, '162004', 'Area1', ['warm'], {
        // "Red - outermost (34 kt); Purple - second (50 kt, 64 kt Atlantic); Red or Black - innermost
        // (100 kt)." The ring's colour carries its wind speed; the only text the row documents and
        // draws is the boxed date-time label.
        operatorColor: ['warm', 'isotach', 'black'],
        dateTimeLabel: true,
    }),
    metocSpec('InstrumentFlightRule', 'Instrument Flight Rule (IFR)', A, 45, '170100', 'Area2', ['warm']),
    metocSpec('MarginalVisualFlightRule', 'Marginal Visual Flight Rule (MVFR)', A, 45, '170200', 'Area2', ['cold']),
    metocSpec('Turbulence', 'Turbulence', A, 45, '170300', 'Area2', ['cold']),
    metocSpec('Icing', 'Icing', A, 45, '170400', 'Area2', ['brown']),
    metocSpec('LiquidPrecipitation', 'Liquid Precipitation - Non-Convective Continuous or Intermittent', A, 45, '170500', 'Area2', ['green']),
    metocSpec('ConvectivePrecipitation', 'Liquid Precipitation - Convective', A, 45, '170501', 'Area2', ['green']),
    metocSpec('FreezingPrecipitation', 'Freezing/Frozen Precipitation', A, 45, '170600', 'Area2', ['warm']),
    metocSpec('Thunderstorm', 'Thunderstorm', A, 45, '170700', 'Area2', ['warm']),
    metocSpec('Fog', 'Fog', A, 45, '170800', 'Area2', ['yellow']),
    metocSpec('DustOrSand', 'Dust or Sand', A, 45, '170900', 'Area2', ['brown']),
    metocSpec('OperatorDefinedFreeformArea', 'Operator-Defined Freeform Area', A, 45, '171000', 'Area2', ['black'], {
        valueField: v('Label', 'Area name'),
        operatorColor: true,
        operatorDash: true,
    }),
] as const;
