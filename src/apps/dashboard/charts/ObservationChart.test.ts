import { describe, expect, it } from "vitest";
import { withGaps } from "./ObservationChart";

const MINUTE = 60 * 1000;

describe("withGaps", () => {
    it("keeps regular series unchanged", () => {
        const observations = [0, 20, 40, 60].map((m) => ({ time: m * MINUTE, value: m }));
        expect(withGaps(observations)).toEqual(
            observations.map((o) => ({ x: o.time, y: o.value }))
        );
    });

    it("inserts a gap where data is missing", () => {
        const observations = [0, 20, 40, 60, 60 * 24].map((m) => ({ time: m * MINUTE, value: 1 }));
        const points = withGaps(observations);
        expect(points).toHaveLength(6);
        expect(points[4]).toEqual({ x: ((60 + 60 * 24) / 2) * MINUTE, y: null });
    });

    it("handles empty input", () => {
        expect(withGaps([])).toEqual([]);
    });
});
