import { createLogger, isAbortError } from "@open-pioneer/core";
import { Highlight, MapModel } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import { Point } from "ol/geom";
import OlMap from "ol/Map";
import { unByKey } from "ol/Observable";
import { Pixel } from "ol/pixel";
import { useEffect, useRef } from "react";
import { getDatastreamProperties, StaDatastreamProperties } from "../dataLayers/sta";
import { addClickMarker, addSensorSelection } from "./clickMarker";
import { FeatureInfoResult, getQueryableWmsLayers, queryWmsFeatureInfo } from "./featureInfo";
import { FeatureInfoPopup } from "./FeatureInfoPopup";
import { createMapPopup } from "./mapPopup";
import { getPopupMaxHeight } from "./popupPlacement";
import { SensorPopup } from "./SensorPopup";

const LOG = createLogger("dashboard:useMapClick");

export interface MapClickOptions {
    /** Called when a sensor (data layer id) should be shown in the analysis panel. */
    onShowDatastream?(dataLayerId: string): void;
}

/** Pixel tolerance for hitting a sensor point. */
const HIT_TOLERANCE = 5;

/** All sensors at the pixel (several sensors may share a location) and the location of the first one. */
function sensorsAt(
    olMap: OlMap,
    pixel: Pixel
): { datastreams: StaDatastreamProperties[]; location: Coordinate | undefined } {
    const datastreams: StaDatastreamProperties[] = [];
    let location: Coordinate | undefined;
    olMap.forEachFeatureAtPixel(
        pixel,
        (feature) => {
            const datastream = getDatastreamProperties(feature);
            if (datastream && !datastreams.some((d) => d.dataLayerId === datastream.dataLayerId)) {
                datastreams.push(datastream);
                const geometry = feature.getGeometry();
                location ??= geometry instanceof Point ? geometry.getCoordinates() : undefined;
            }
        },
        { hitTolerance: HIT_TOLERANCE }
    );
    return { datastreams, location };
}

/**
 * Handles clicks into the map:
 * - a click on a sensor point marks it and shows a popup with all sensors at that position; each one
 *   can be shown in the analysis panel (see {@link MapClickOptions.onShowDatastream}),
 * - otherwise, a marker is set at the clicked position and WMS GetFeatureInfo results
 *   are shown in a popup next to it.
 */
export function useMapClick(map: MapModel | undefined, options: MapClickOptions = {}) {
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    });

    useEffect(() => {
        if (!map) {
            return;
        }

        const olMap = map.olMap;
        const popup = createMapPopup(map);
        let marker: Highlight | undefined;
        let pendingRequest: AbortController | undefined;
        const closeOverlay = () => {
            pendingRequest?.abort();
            pendingRequest = undefined;
            popup.close();
        };
        // Closes the popup and removes the marker (click position or selected sensor).
        const closePopup = () => {
            closeOverlay();
            marker?.destroy();
            marker = undefined;
        };

        const pointerKey = olMap.on("pointermove", (event) => {
            if (event.dragging) {
                return;
            }
            const target = olMap.getTargetElement();
            if (target) {
                target.style.cursor = sensorsAt(olMap, event.pixel).datastreams.length ? "pointer" : "";
            }
        });

        // Every click into the map first removes the previous popup and selection.
        const clickKey = olMap.on("singleclick", (event) => {
            closePopup();
            const maxHeight = getPopupMaxHeight(olMap.getSize()?.[1] ?? 0);
            const { datastreams, location = event.coordinate } = sensorsAt(olMap, event.pixel);
            if (datastreams.length) {
                // The sensor stays marked until the next click into the map (or the popup is closed).
                marker = addSensorSelection(map, location);
                popup.open(
                    location,
                    olMap.getPixelFromCoordinate(location) ?? event.pixel,
                    <SensorPopup
                        map={map}
                        datastreams={datastreams}
                        maxHeight={maxHeight}
                        onClose={closePopup}
                        onShow={(dataLayerId) => {
                            // Keep the sensor marked while it is shown in the analysis panel.
                            closeOverlay();
                            optionsRef.current.onShowDatastream?.(dataLayerId);
                        }}
                    />
                );
                return;
            }

            const layers = getQueryableWmsLayers(map);
            if (!layers.length) {
                return;
            }

            const request = (pendingRequest = new AbortController());
            const content = (results: FeatureInfoResult[] | undefined) => (
                <FeatureInfoPopup map={map} results={results} maxHeight={maxHeight} onClose={closePopup} />
            );
            marker = addClickMarker(map, event.coordinate);
            const overlay = popup.open(event.coordinate, event.pixel, content(undefined));

            queryWmsFeatureInfo(map, layers, event.coordinate, request.signal)
                .then((results) => {
                    if (!overlay.isDestroyed) {
                        overlay.setContent(content(results));
                    }
                })
                .catch((error) => {
                    if (!isAbortError(error)) {
                        LOG.error("Failed to query feature info.", error);
                    }
                });
        });

        return () => {
            unByKey([pointerKey, clickKey]);
            closePopup();
            popup.destroy();
        };
    }, [map]);
}
