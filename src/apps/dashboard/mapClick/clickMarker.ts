// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Highlight, MapModel } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import { Point } from "ol/geom";
import { Circle, Icon, Stroke, Style } from "ol/style";

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
<path d="M14 1C7 1 1.5 6.5 1.5 13.5 1.5 23 14 39 14 39s12.5-16 12.5-25.5C26.5 6.5 21 1 14 1z" fill="#2a78d6" stroke="#ffffff" stroke-width="2"/>
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

/** Ring around a selected sensor point (the sensor point itself has a radius of 8px). */
const SENSOR_SELECTION_STYLE = [
    new Style({
        image: new Circle({ radius: 13, stroke: new Stroke({ color: "#ffffff", width: 5 }) })
    }),
    new Style({
        image: new Circle({ radius: 13, stroke: new Stroke({ color: "#2a78d6", width: 3 }) })
    })
];

/**
 * Marks a selected sensor point with a ring. Call `destroy()` on the result to remove it.
 */
export function addSensorSelection(map: MapModel, coordinate: Coordinate): Highlight {
    return map.highlights.add([new Point(coordinate)], {
        highlightStyle: { Point: SENSOR_SELECTION_STYLE }
    });
}
