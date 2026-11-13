import { createLogger, isAbortError } from "@open-pioneer/core";
import { useEffect, useState } from "react";
import { fetchObservations, Observation, StaDatastreamProperties } from "../dataLayers/sta/sta";
import { TimeRange } from "./timeRange";

const LOG = createLogger("dashboard:useSeriesObservations");

/**
 * Loads the observations of several sensors for the time range, each on its own: a sensor that fails
 * does not affect the others. Returns the observations by data layer id, or `"error"` for a sensor that failed;
 * a sensor without entry is still loading.
 */
export function useSeriesObservations(
    datastreams: StaDatastreamProperties[],
    range: TimeRange
): Record<string, Observation[] | "error"> {
    const [states, setStates] = useState<Record<string, Observation[] | "error">>({});
    // The array is new whenever a datastream has been loaded, the urls change only with the sensors.
    const sources = datastreams
        .map((datastream) => `${datastream.dataLayerId} ${datastream.observationsUrl}`)
        .join("\n");

    useEffect(() => {
        const controller = new AbortController();
        setStates({});
        for (const source of sources ? sources.split("\n") : []) {
            const [id = "", observationsUrl = ""] = source.split(" ");
            const setState = (state: Observation[] | "error") =>
                setStates((previous) => ({ ...previous, [id]: state }));
            fetchObservations(observationsUrl, range, controller.signal)
                .then(({ observations }) => setState(observations))
                .catch((error) => {
                    if (!isAbortError(error)) {
                        LOG.error(`Failed to load the observations of ${observationsUrl}`, error);
                        setState("error");
                    }
                });
        }
        return () => controller.abort();
    }, [sources, range]);

    return states;
}
