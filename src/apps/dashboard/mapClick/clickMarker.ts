import { Highlight, MapModel } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import { Geometry, Point } from "ol/geom";
import { Circle, Icon, Stroke, Style } from "ol/style";

/** Color of the click marker and of the sensor selection ring. */
const MARKER_COLOR = "#2a78d6";

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
<path d="M14 1C7 1 1.5 6.5 1.5 13.5 1.5 23 14 39 14 39s12.5-16 12.5-25.5C26.5 6.5 21 1 14 1z" fill="${MARKER_COLOR}" stroke="#ffffff" stroke-width="2"/>
<circle cx="14" cy="13.5" r="4.5" fill="#ffffff"/>
</svg>`;

const MARKER_STYLE = new Style({
    image: new Icon({
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PIN_SVG)}`,
        anchor: [0.5, 1] // tip of the pin
    })
});

/**
 * Shows a marker (pin) at the clicked position. Call `destroy()` on the result to remove it.
 */
export function addClickMarker(map: MapModel, coordinate: Coordinate): Highlight {
    return map.highlights.add([new Point(coordinate)], {
        highlightStyle: { Point: MARKER_STYLE }
    });
}

/** Ring of the given radius in the marker colour with a white halo, around a selected point. */
function selectionRing(radius: number): Style[] {
    return [
        new Style({ image: new Circle({ radius, stroke: new Stroke({ color: "#ffffff", width: 5 }) }) }),
        new Style({ image: new Circle({ radius, stroke: new Stroke({ color: MARKER_COLOR, width: 3 }) }) })
    ];
}

/** Ring around a selected sensor point (the sensor point itself has a radius of 8px). */
const SENSOR_SELECTION_STYLE = selectionRing(13);

/**
 * Marks a selected sensor point with a ring. Call `destroy()` on the result to remove it.
 */
export function addSensorSelection(map: MapModel, coordinate: Coordinate): Highlight {
    return map.highlights.add([new Point(coordinate)], {
        highlightStyle: { Point: SENSOR_SELECTION_STYLE }
    });
}

/** Outline in the marker colour with a white halo; the feature's own fill stays visible below. */
const OUTLINE_STYLE = [
    new Style({ stroke: new Stroke({ color: "#ffffff", width: 6 }) }),
    new Style({ stroke: new Stroke({ color: MARKER_COLOR, width: 3 }) })
];

/** Ring around WFS points (radius 6px), outline of lines and polygons. */
const FEATURE_SELECTION_STYLE = {
    Point: selectionRing(10),
    MultiPoint: selectionRing(10),
    LineString: OUTLINE_STYLE,
    MultiLineString: OUTLINE_STYLE,
    Polygon: OUTLINE_STYLE,
    MultiPolygon: OUTLINE_STYLE
};

/**
 * Marks the clicked features (of WFS layers). Call `destroy()` on the result to remove it.
 */
export function addFeatureSelection(map: MapModel, geometries: Geometry[]): Highlight {
    return map.highlights.add(geometries, { highlightStyle: FEATURE_SELECTION_STYLE });
}
