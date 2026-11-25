import { asArray } from "ol/color";
import { FeatureLike } from "ol/Feature";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { WfsDataLayerConfig } from "../config/types";

/**
 * Colours of WFS layers, distinguishable from each other on the usual base maps.
 * Sensor points have the colours of their stations (`dataLayers/sta/stationColors.ts`), some of them are similar.
 */
const WFS_PALETTE: [string, ...string[]] = [
    "#2b6cb0",
    "#2f855a",
    "#6b46c1",
    "#c53030",
    "#00838f",
    "#d53f8c",
    "#4a5568",
    "#975a16"
];

/** The palette colour at `index`, starting over after the last one. */
export function paletteColor(index: number): string {
    const length = WFS_PALETTE.length;
    return WFS_PALETTE[((index % length) + length) % length] ?? WFS_PALETTE[0];
}

/** A palette colour derived from the layer id, so that it stays the same across reloads. */
function colorForId(id: string): string {
    let hash = 0;
    for (const char of id) {
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    return paletteColor(Math.abs(hash));
}

/** The colour of a WFS layer: configured, otherwise derived from its id. */
export function wfsLayerColor(config: WfsDataLayerConfig): string {
    return config.wfs.color ?? colorForId(config.id);
}

/** The colour with the given opacity, as `rgba(…)`. */
function withAlpha(color: string, alpha: number): string {
    const [r, g, b] = asArray(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Style function for WFS features in one colour: points as circles, lines as strokes, polygons with outline and a
 * translucent fill (so that the map below stays visible).
 */
export function createWfsStyle(color: string): (feature: FeatureLike) => Style {
    const stroke = new Stroke({ color, width: 2 });
    const fill = new Fill({ color: withAlpha(color, 0.2) });
    const point = new Style({
        image: new Circle({
            radius: 6,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: "#ffffff", width: 1.5 })
        })
    });
    const line = new Style({ stroke });
    const polygon = new Style({ stroke, fill });
    return (feature) => {
        const type = feature.getGeometry()?.getType();
        if (type === "Point" || type === "MultiPoint") {
            return point;
        }
        return type === "LineString" || type === "MultiLineString" ? line : polygon;
    };
}
