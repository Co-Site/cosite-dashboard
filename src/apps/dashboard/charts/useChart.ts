import { Chart, ChartConfiguration, ChartType as ChartJsType, DefaultDataPoint } from "chart.js";
import { RefObject, useEffect, useRef } from "react";

/**
 * Draws a Chart.js chart on the returned canvas ref and keeps its data up to date.
 *
 * - `createConfig` returns the chart configuration (without data). When it changes (e.g. on a language change),
 *   the chart is destroyed and created again.
 * - `applyData` puts the data into the chart. It runs after every creation and whenever it changes,
 *   so a recreated chart never stays empty.
 *
 * Wrap both in `useCallback` so that they only change with their dependencies.
 */
export function useChart<TType extends ChartJsType, TData = DefaultDataPoint<TType>>(
    createConfig: () => ChartConfiguration<TType, TData>,
    applyData: (chart: Chart<TType, TData>) => void
): RefObject<HTMLCanvasElement | null> {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart<TType, TData>>(undefined);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const chart = new Chart<TType, TData>(canvas, createConfig());
        chartRef.current = chart;
        return () => {
            chart.destroy();
            chartRef.current = undefined;
        };
    }, [createConfig]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) {
            return;
        }
        applyData(chart);
        chart.update();
        // `createConfig`: the data must be applied again after the chart has been created again.
    }, [createConfig, applyData]);

    return canvasRef;
}
