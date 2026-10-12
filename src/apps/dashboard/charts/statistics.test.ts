// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { bucketSize, bucketStart, meanPerBucket } from "./statistics";

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
