import { ChartType } from "./chartTypes";

/** Tabs of the analysis panel. */
export type AnalysisTab = "single" | "compare";

/** A view with its own chart type: the single view or a half (0, 1) of the compare view. */
export type AnalysisView = "single" | 0 | 1;

/** Sensors (data layer ids) selected in the analysis panel. */
export interface AnalysisSelection {
    tab: AnalysisTab;

    /** Sensor of the single view. */
    single?: string;

    /** Sensors of the two halves of the compare view. */
    compare: [string | undefined, string | undefined];

    /** Chart types of the single view and of the two halves of the compare view. */
    charts: { single: ChartType; compare: [ChartType, ChartType] };
}

export const INITIAL_SELECTION: AnalysisSelection = {
    tab: "single",
    compare: [undefined, undefined],
    charts: { single: "line", compare: ["line", "line"] }
};

/**
 * Fills missing selections with defaults from the available sensors:
 * the first sensor for the single view, the first and second sensor for the compare view.
 * Selections of sensors that are not available (anymore) are replaced as well.
 */
export function withDefaultSensors(selection: AnalysisSelection, sensorIds: string[]): AnalysisSelection {
    const valid = (id: string | undefined) => (id && sensorIds.includes(id) ? id : undefined);
    const [first, second = first] = sensorIds;
    return {
        ...selection,
        single: valid(selection.single) ?? first,
        compare: [valid(selection.compare[0]) ?? first, valid(selection.compare[1]) ?? second]
    };
}

/** Shows the sensor in a half of the compare view. */
export function withCompareSensor(selection: AnalysisSelection, index: 0 | 1, sensorId: string): AnalysisSelection {
    const compare: AnalysisSelection["compare"] = [...selection.compare];
    compare[index] = sensorId;
    return { ...selection, compare };
}

/** Sets the chart type of a view. */
export function withChartType(
    selection: AnalysisSelection,
    view: AnalysisView,
    chartType: ChartType
): AnalysisSelection {
    const { single, compare } = selection.charts;
    const charts: AnalysisSelection["charts"] =
        view === "single"
            ? { single: chartType, compare }
            : {
                  single,
                  compare: view === 0 ? [chartType, compare[1]] : [compare[0], chartType]
              };
    return { ...selection, charts };
}
