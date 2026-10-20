import { describe, expect, it } from "vitest";
import { locationKey } from "./sta";

describe("locationKey", () => {
    it("rounds the coordinates of a point", () => {
        expect(locationKey({ type: "Point", coordinates: [6.99812345, 50.938012] })).toBe("6.998123,50.938012");
    });

    it("is equal for points that differ less than the rounding", () => {
        expect(locationKey({ type: "Point", coordinates: [7.0000001, 51] })).toBe(
            locationKey({ type: "Point", coordinates: [7, 51.0000002] })
        );
    });

    it("has no key for other or missing geometries", () => {
        expect(
            locationKey({
                type: "Polygon",
                coordinates: [
                    [
                        [7, 51],
                        [8, 51],
                        [7, 52],
                        [7, 51]
                    ]
                ]
            })
        ).toBeUndefined();
        expect(locationKey({ type: "Point", coordinates: ["7", "51"] })).toBeUndefined();
        expect(locationKey(undefined)).toBeUndefined();
    });
});
