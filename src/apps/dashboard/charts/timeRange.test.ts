// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { fromLocalInputValue, presetFilter, toLocalInputValue } from "./timeRange";

describe("timeRange", () => {
    it("creates preset ranges ending now", () => {
        const now = new Date(2026, 9, 9, 12, 0);
        const { preset, range } = presetFilter("7d", now);
        expect(preset).toBe("7d");
        expect(range.to).toEqual(now);
        expect(range.from).toEqual(new Date(2026, 9, 2, 12, 0));
    });

    it("round-trips datetime-local input values", () => {
        const date = new Date(2026, 0, 5, 7, 3);
        expect(toLocalInputValue(date)).toBe("2026-01-05T07:03");
        expect(fromLocalInputValue("2026-01-05T07:03")).toEqual(date);
    });

    it("rejects invalid input values", () => {
        expect(fromLocalInputValue("")).toBeUndefined();
        expect(fromLocalInputValue("05.01.2026")).toBeUndefined();
    });
});
