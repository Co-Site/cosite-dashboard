// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger, isAbortError } from "@open-pioneer/core";
import { MapModel, Overlay } from "@open-pioneer/map";
import { unByKey } from "ol/Observable";
import { useEffect } from "react";
import { getQueryableWmsLayers, queryWmsFeatureInfo } from "./featureInfo";
import { FeatureInfoPopup } from "./FeatureInfoPopup";

const LOG = createLogger("dashboard:useMapClick");

/**
 * Handles clicks into the map: shows WMS GetFeatureInfo results in a popup.
 */
export function useMapClick(map: MapModel | undefined) {
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

        const key = map.olMap.on("singleclick", (event) => {
            closePopup();
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
            unByKey(key);
            closePopup();
        };
    }, [map]);
}
