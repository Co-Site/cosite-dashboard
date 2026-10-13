import { describe, expect, it } from "vitest";
import { getPopupMaxHeight, getPopupOffset } from "./popupPlacement";

const MAP = [1400, 480];
const POPUP = [300, 200];

describe("getPopupOffset", () => {
    it("places the popup right of and below the click", () => {
        expect(getPopupOffset([100, 50], MAP, POPUP)).toEqual([18, 8]);
    });

    it("moves the popup up if there is not enough space below", () => {
        // bottom edge at map height - margin: 480 - 8 - 200 = 272 => offset 272 - 400
        expect(getPopupOffset([100, 400], MAP, POPUP)).toEqual([18, -128]);
    });

    it("never moves the popup above the top of the map", () => {
        expect(getPopupOffset([100, 100], [1400, 150], POPUP)).toEqual([18, -92]);
    });

    it("places the popup left of the click near the right border", () => {
        expect(getPopupOffset([1300, 50], MAP, POPUP)).toEqual([-318, 8]);
    });
});

describe("getPopupMaxHeight", () => {
    it("fits the popup into the map", () => {
        expect(getPopupMaxHeight(300)).toBe(284);
        expect(getPopupMaxHeight(1000)).toBe(400);
    });
});
