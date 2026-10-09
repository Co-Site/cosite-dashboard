// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger, isAbortError } from "@open-pioneer/core";
import { MapModel, Overlay } from "@open-pioneer/map";
import { unByKey } from "ol/Observable";
import { useEffect, useRef } from "react";
import { getDatastreamProperties, StaDatastreamProperties } from "../dataLayers/sta";
import { getQueryableWmsLayers, queryWmsFeatureInfo } from "./featureInfo";
import { FeatureInfoPopup } from "./FeatureInfoPopup";

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
 * - otherwise, WMS GetFeatureInfo results are shown in a popup.
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
        let pendingRequest: AbortController | undefined;
        const closePopup = () => {
            pendingRequest?.abort();
            pendingRequest = undefined;
            popup?.destroy();
            popup = undefined;
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
            const overlay = (popup = map.overlays.add({
                position: event.coordinate,
                positioning: "bottom-center",
                offset: [0, -12],
                stopEvent: true,
                content: <FeatureInfoPopup results={undefined} onClose={closePopup} />
            }));
            queryWmsFeatureInfo(map, layers, event.coordinate, request.signal)
                .then((results) => {
                    if (!overlay.isDestroyed) {
                        overlay.setContent(
                            <FeatureInfoPopup results={results} onClose={closePopup} />
                        );
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
        };
    }, [map]);
}
