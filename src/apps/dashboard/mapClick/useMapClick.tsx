// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger, isAbortError } from "@open-pioneer/core";
import { Highlight, MapModel, Overlay } from "@open-pioneer/map";
import { unByKey } from "ol/Observable";
import { useEffect, useRef } from "react";
import { getDatastreamProperties, StaDatastreamProperties } from "../dataLayers/sta";
import { addClickMarker } from "./clickMarker";
import { FeatureInfoResult, getQueryableWmsLayers, queryWmsFeatureInfo } from "./featureInfo";
import { FeatureInfoPopup } from "./FeatureInfoPopup";
import { getPopupMaxHeight, getPopupOffset } from "./popupPlacement";

const LOG = createLogger("dashboard:useMapClick");

export interface MapClickOptions {
    /** Called when a SensorThings datastream feature was clicked. */
    onDatastreamClick?(datastream: StaDatastreamProperties): void;
}

/** Pixel tolerance for hitting a sensor point. */
const HIT_TOLERANCE = 5;

/**
 * Handles clicks into the map:
 * - a click on a sensor point selects its datastream (see {@link MapClickOptions.onDatastreamClick}),
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

        const olMap = map.olMap;
        const datastreamAt = (pixel: number[]) =>
            olMap.forEachFeatureAtPixel(pixel, (feature) => getDatastreamProperties(feature), {
                hitTolerance: HIT_TOLERANCE
            });

        const pointerKey = olMap.on("pointermove", (event) => {
            if (event.dragging) {
                return;
            }
            const target = olMap.getTargetElement();
            if (target) {
                target.style.cursor = datastreamAt(event.pixel) ? "pointer" : "";
            }
        });

        const clickKey = olMap.on("singleclick", (event) => {
            closePopup();
            const datastream = datastreamAt(event.pixel);
            if (datastream) {
                optionsRef.current.onDatastreamClick?.(datastream);
                return;
            }

            const layers = getQueryableWmsLayers(map);
            if (!layers.length) {
                return;
            }

            const request = (pendingRequest = new AbortController());
            const maxHeight = getPopupMaxHeight(olMap.getSize()?.[1] ?? 0);
            const content = (results: FeatureInfoResult[] | undefined) => (
                <FeatureInfoPopup
                    map={map}
                    results={results}
                    maxHeight={maxHeight}
                    onClose={closePopup}
                />
            );
            marker = addClickMarker(map, event.coordinate);
            const overlay = (popup = map.overlays.add({
                position: event.coordinate,
                positioning: "top-left",
                offset: getPopupOffset(event.pixel, olMap.getSize() ?? [0, 0], [0, 0]),
                stopEvent: true,
                content: content(undefined)
            }));
            popupResizeObserver = new ResizeObserver(placePopup);
            popupResizeObserver.observe(overlay.element);

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
