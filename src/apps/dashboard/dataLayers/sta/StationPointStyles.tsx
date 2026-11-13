import { isLayer, useMapModelValue } from "@open-pioneer/map";
import VectorLayer from "ol/layer/Vector";
import { useEffect } from "react";
import { sensorStyle } from "./staLayer";
import { useStationColors } from "./useStaSensors";

/**
 * Draws the sensor points on the map in the colour of their station. Renders nothing.
 */
export function StationPointStyles() {
    const map = useMapModelValue();
    const colors = useStationColors(map);
    useEffect(() => {
        for (const [dataLayerId, color] of Object.entries(colors)) {
            const layer = map.layers.getLayerById(dataLayerId);
            if (layer && isLayer(layer) && layer.olLayer instanceof VectorLayer) {
                layer.olLayer.setStyle(sensorStyle(color));
            }
        }
    }, [map, colors]);
    return null;
}
