// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger, isAbortError } from "@open-pioneer/core";
import { Highlight, MapModel, Overlay } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import { unByKey } from "ol/Observable";
import { Pixel } from "ol/pixel";
import { ReactNode, useEffect, useRef } from "react";
import { getDatastreamProperties, StaDatastreamProperties } from "../dataLayers/sta";
import { addClickMarker } from "./clickMarker";
import { FeatureInfoResult, getQueryableWmsLayers, queryWmsFeatureInfo } from "./featureInfo";
import { FeatureInfoPopup } from "./FeatureInfoPopup";
import { getPopupMaxHeight, getPopupOffset } from "./popupPlacement";
import { SensorPopup } from "./SensorPopup";

const LOG = createLogger("dashboard:useMapClick");

export interface MapClickOptions {
    /** Called when a sensor (data layer id) should be shown in the analysis panel. */
    onShowDatastream?(dataLayerId: string): void;
}

/** Pixel tolerance for hitting a sensor point. */
const HIT_TOLERANCE = 5;

/**
 * Handles clicks into the map:
 * - a click on a sensor point shows a popup with all sensors at that position; each one can be shown
 *   in the analysis panel (see {@link MapClickOptions.onShowDatastream}),
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

        let popup: Overlay | undefined;
        let marker: Highlight | undefined;
        let popupResizeObserver: ResizeObserver | undefined;
        let pendingRequest: AbortController | undefined;
        const closePopup = () => {
            pendingRequest?.abort();
            pendingRequest = undefined;
            popupResizeObserver?.disconnect();
            popupResizeObserver = undefined;
            popup?.destroy();
            popup = undefined;
            marker?.destroy();
            marker = undefined;
        };

        // Places the popup next to the clicked position, fully visible within the map.
        // Called again whenever the popup or the map changes its size.
        const placePopup = () => {
            const coordinate = popup?.currentCoordinate;
            const size = olMap.getSize();
            if (!popup || !coordinate || !size) {
                return;
            }
            const pixel = olMap.getPixelFromCoordinate(coordinate);
            const rect = popup.element.getBoundingClientRect();
            if (pixel) {
                popup.setOffset(getPopupOffset(pixel, size, [rect.width, rect.height]));
            }
        };

        const openPopup = (coordinate: Coordinate, pixel: Pixel, content: ReactNode) => {
            const overlay = (popup = map.overlays.add({
                position: coordinate,
                positioning: "top-left",
                offset: getPopupOffset(pixel, olMap.getSize() ?? [0, 0], [0, 0]),
                stopEvent: true,
                content
            }));
            popupResizeObserver = new ResizeObserver(placePopup);
            popupResizeObserver.observe(overlay.element);
            return overlay;
        };

        const olMap = map.olMap;
        // All sensors at the position (several sensors may share a location).
        const datastreamsAt = (pixel: Pixel) => {
            const datastreams: StaDatastreamProperties[] = [];
            olMap.forEachFeatureAtPixel(
                pixel,
                (feature) => {
                    const datastream = getDatastreamProperties(feature);
                    if (
                        datastream &&
                        !datastreams.some((d) => d.dataLayerId === datastream.dataLayerId)
                    ) {
                        datastreams.push(datastream);
                    }
                },
                { hitTolerance: HIT_TOLERANCE }
            );
            return datastreams;
        };

        const pointerKey = olMap.on("pointermove", (event) => {
            if (event.dragging) {
                return;
            }
            const target = olMap.getTargetElement();
            if (target) {
                target.style.cursor = datastreamsAt(event.pixel).length ? "pointer" : "";
            }
        });

        const clickKey = olMap.on("singleclick", (event) => {
            closePopup();
            const maxHeight = getPopupMaxHeight(olMap.getSize()?.[1] ?? 0);
            const datastreams = datastreamsAt(event.pixel);
            if (datastreams.length) {
                openPopup(
                    event.coordinate,
                    event.pixel,
                    <SensorPopup
                        map={map}
                        datastreams={datastreams}
                        maxHeight={maxHeight}
                        onClose={closePopup}
                        onShow={(dataLayerId) => {
                            closePopup();
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
                <FeatureInfoPopup
                    map={map}
                    results={results}
                    maxHeight={maxHeight}
                    onClose={closePopup}
                />
            );
            marker = addClickMarker(map, event.coordinate);
            const overlay = openPopup(event.coordinate, event.pixel, content(undefined));

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

        const sizeKey = olMap.on("change:size", placePopup);

        return () => {
            unByKey([pointerKey, clickKey, sizeKey]);
            closePopup();
        };
    }, [map]);
}
