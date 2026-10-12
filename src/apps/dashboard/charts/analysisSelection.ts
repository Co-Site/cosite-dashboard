// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/** Tabs of the analysis panel. */
export type AnalysisTab = "single" | "compare";

/** Sensors (data layer ids) selected in the analysis panel. */
export interface AnalysisSelection {
    tab: AnalysisTab;

    /** Sensor of the single view. */
    single?: string;

    /** Sensors of the two halves of the compare view. */
    compare: [string | undefined, string | undefined];
}

export const INITIAL_SELECTION: AnalysisSelection = {
    tab: "single",
    compare: [undefined, undefined]
};

/**
 * Fills missing selections with defaults from the available sensors:
 * the first sensor for the single view, the first and second sensor for the compare view.
 * Selections of sensors that are not available (anymore) are replaced as well.
 */
export function withDefaultSensors(
    selection: AnalysisSelection,
    sensorIds: string[]
): AnalysisSelection {
    const valid = (id: string | undefined) => (id && sensorIds.includes(id) ? id : undefined);
    const [first, second = first] = sensorIds;
    return {
        tab: selection.tab,
        single: valid(selection.single) ?? first,
        compare: [valid(selection.compare[0]) ?? first, valid(selection.compare[1]) ?? second]
    };
}
