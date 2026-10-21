import { MapModel, Overlay } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import { unByKey } from "ol/Observable";
import { Pixel } from "ol/pixel";
import { ReactNode } from "react";
import { getPopupOffset } from "./popupPlacement";

/** The popup of the map, see {@link createMapPopup}. */
export interface MapPopup {
    /** Opens the popup at the clicked position (`pixel` is its position on the screen); an open popup is closed. */
    open(coordinate: Coordinate, pixel: Pixel, content: ReactNode): Overlay;

    close(): void;

    /** Closes the popup and stops following size changes of the map. */
    destroy(): void;
}

/**
 * Manages the popup of the map: one at a time, placed next to the clicked position and fully visible within the
 * map (see `popupPlacement.ts`). It is placed again whenever the popup or the map changes its size.
 */
export function createMapPopup(map: MapModel): MapPopup {
    const olMap = map.olMap;
    let overlay: Overlay | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const place = () => {
        const coordinate = overlay?.currentCoordinate;
        const size = olMap.getSize();
        if (!overlay || !coordinate || !size) {
            return;
        }
        const pixel = olMap.getPixelFromCoordinate(coordinate);
        const rect = overlay.element.getBoundingClientRect();
        if (pixel) {
            overlay.setOffset(getPopupOffset(pixel, size, [rect.width, rect.height]));
        }
    };

    const close = () => {
        resizeObserver?.disconnect();
        resizeObserver = undefined;
        overlay?.destroy();
        overlay = undefined;
    };

    const open = (coordinate: Coordinate, pixel: Pixel, content: ReactNode) => {
        close();
        const opened = (overlay = map.overlays.add({
            position: coordinate,
            positioning: "top-left",
            offset: getPopupOffset(pixel, olMap.getSize() ?? [0, 0], [0, 0]),
            stopEvent: true,
            content
        }));
        resizeObserver = new ResizeObserver(place);
        resizeObserver.observe(opened.element);
        return opened;
    };

    const sizeKey = olMap.on("change:size", place);
    const destroy = () => {
        unByKey(sizeKey);
        close();
    };

    return { open, close, destroy };
}
