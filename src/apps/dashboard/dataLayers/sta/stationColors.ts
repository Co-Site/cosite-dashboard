/**
 * Colours of the stations, used wherever a sensor appears (map, TOC, tiles, charts).
 * In this order, neighbouring colours stay distinguishable with colour vision deficiencies;
 * colours far apart in the list can look alike.
 */
const STATION_COLORS: [string, ...string[]] = [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#6250d6",
    "#e34948",
    "#25a5c9",
    "#7cb518",
    "#1c5cab",
    "#b03a6e",
    "#7a8500",
    "#8f7be0",
    "#c08a4a",
    "#0a7a4b",
    "#a24cc2",
    "#a35a14",
    "#00889e",
    "#9c2b2b"
];

/** Colour of the station with the given number (see `assignStations`); the colours repeat after the last one. */
export function stationColor(station: number): string {
    return STATION_COLORS[station % STATION_COLORS.length] ?? STATION_COLORS[0];
}
