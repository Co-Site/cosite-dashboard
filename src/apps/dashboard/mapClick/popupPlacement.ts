/** Horizontal distance between the clicked position (marker) and the popup. */
const GAP_X = 18;

/** Vertical distance: the popup's top edge is placed this far below the clicked position. */
const GAP_Y = 8;

/** Minimal distance between the popup and the border of the map. */
const POPUP_MARGIN = 8;

/** Upper limit for the popup's height. */
const MAX_POPUP_HEIGHT = 400;

/**
 * Maximum height of the popup so that it always fits into the map (it scrolls if it is larger).
 */
export function getPopupMaxHeight(mapHeight: number): number {
    return Math.max(100, Math.min(MAX_POPUP_HEIGHT, mapHeight - 2 * POPUP_MARGIN));
}

/**
 * Computes the offset of the popup (positioned with its top left corner at the clicked position).
 *
 * - The popup is placed next to the clicked position (right of it, or left of it near the right border)
 *   with its top edge below the clicked position.
 * - If there is not enough space below, it is moved up just enough to be fully visible.
 */
export function getPopupOffset(clickPixel: number[], mapSize: number[], popupSize: number[]): [number, number] {
    const [x = 0, y = 0] = clickPixel;
    const [mapWidth = 0, mapHeight = 0] = mapSize;
    const [width = 0, height = 0] = popupSize;

    let left = x + GAP_X;
    if (left + width > mapWidth - POPUP_MARGIN) {
        left = x - GAP_X - width;
    }
    left = Math.max(POPUP_MARGIN, left);

    const top = Math.max(POPUP_MARGIN, Math.min(y + GAP_Y, mapHeight - POPUP_MARGIN - height));
    return [Math.round(left - x), Math.round(top - y)];
}
