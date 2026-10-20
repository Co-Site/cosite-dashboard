import { describe, expect, it } from "vitest";
import { locationKey, parseObservation } from "./sta";

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

describe("parseObservation", () => {
    it("converts numeric observations", () => {
        expect(parseObservation({ phenomenonTime: "2026-10-20T08:00:00Z", result: 12.5 })).toEqual({
            time: Date.parse("2026-10-20T08:00:00Z"),
            value: 12.5
        });
    });

    it("uses the start of a time interval", () => {
        expect(parseObservation({ phenomenonTime: "2026-10-20T08:00:00Z/2026-10-20T09:00:00Z", result: 1 })?.time).toBe(
            Date.parse("2026-10-20T08:00:00Z")
        );
    });

    it("skips non-numeric results and invalid times", () => {
        expect(parseObservation({ phenomenonTime: "2026-10-20T08:00:00Z", result: "12.5" })).toBeUndefined();
        expect(parseObservation({ phenomenonTime: "yesterday", result: 1 })).toBeUndefined();
    });
});
