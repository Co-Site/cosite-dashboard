// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
    bucketSize,
    bucketStart,
    directionFrequencies,
    isDirectionData,
    meanPerBucket
} from "./statistics";

const range = (days: number) => ({ from: new Date(2026, 9, 1), to: new Date(2026, 9, 1 + days) });

describe("bucketSize", () => {
    it("depends on the length of the range", () => {
        expect(bucketSize(range(1))).toBe("hour");
        expect(bucketSize(range(2))).toBe("hour");
        expect(bucketSize(range(7))).toBe("day");
        expect(bucketSize(range(30))).toBe("day");
        expect(bucketSize(range(75))).toBe("week");
    });
});

describe("bucketStart", () => {
    it("rounds down to the hour, day or Monday (local time)", () => {
        // Wednesday, 2026-10-07 14:35
        const time = new Date(2026, 9, 7, 14, 35).getTime();
        expect(bucketStart(time, "hour")).toBe(new Date(2026, 9, 7, 14).getTime());
        expect(bucketStart(time, "day")).toBe(new Date(2026, 9, 7).getTime());
        expect(bucketStart(time, "week")).toBe(new Date(2026, 9, 5).getTime());
    });
});

describe("meanPerBucket", () => {
    it("averages the observations per section and omits empty sections", () => {
        const at = (day: number, hour: number, value: number) => ({
            time: new Date(2026, 9, day, hour).getTime(),
            value
        });
        const buckets = meanPerBucket([at(1, 6, 1), at(1, 18, 3), at(3, 12, 10)], "day");
        expect(buckets).toEqual([
            {
                start: new Date(2026, 9, 1).getTime(),
                end: new Date(2026, 9, 2).getTime(),
                mean: 2,
                count: 2
            },
            {
                start: new Date(2026, 9, 3).getTime(),
                end: new Date(2026, 9, 4).getTime(),
                mean: 10,
                count: 1
            }
        ]);
    });

    it("handles empty input", () => {
        expect(meanPerBucket([], "hour")).toEqual([]);
    });
});

const values = (...v: number[]) => v.map((value, i) => ({ time: i, value }));

describe("isDirectionData", () => {
    it("requires an angle unit and values between 0 and 360", () => {
        expect(isDirectionData("°", values(0, 90, 360))).toBe(true);
        expect(isDirectionData("deg", values(180))).toBe(true);
        expect(isDirectionData("°C", values(12))).toBe(false);
        expect(isDirectionData("%", values(7))).toBe(false);
        expect(isDirectionData(undefined, values(7))).toBe(false);
        expect(isDirectionData("°", values(-1))).toBe(false);
        expect(isDirectionData("°", values(361))).toBe(false);
    });
});

describe("directionFrequencies", () => {
    it("counts the share per sector, centered on the direction", () => {
        const frequencies = directionFrequencies(values(0, 355, 10, 90, 180));
        expect(frequencies).toHaveLength(16);
        expect(frequencies[0]).toBe(60); // N: 0°, 355°, 10°
        expect(frequencies[4]).toBe(20); // E
        expect(frequencies[8]).toBe(20); // S
        expect(frequencies.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it("returns zeros without observations", () => {
        expect(directionFrequencies([])).toEqual(new Array(16).fill(0));
    });
});
