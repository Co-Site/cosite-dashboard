import { Button, Spinner, Stack, Text } from "@chakra-ui/react";
import { createLogger, isAbortError } from "@open-pioneer/core";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useState } from "react";
import { fetchLatestObservation, Observation, StaDatastreamProperties } from "../dataLayers/sta";
import { useLayerTitle } from "../dataLayers/useLayerTitle";

const LOG = createLogger("dashboard:SensorTiles");

type LatestState = { kind: "loading" } | { kind: "loaded"; observation: Observation | undefined };

export interface SensorTilesProps {
    /** The other sensors at the site of the shown sensor. */
    sensors: StaDatastreamProperties[];

    /** Switches the chart to the sensor (data layer id). */
    onSelect(sensorId: string): void;
}

/**
 * Stacked tiles for the other sensors at the same site, each with its newest value.
 * Clicking a tile shows that sensor in the chart instead.
 */
export function SensorTiles(props: SensorTilesProps) {
    const { sensors, onSelect } = props;
    const intl = useIntl();
    return (
        <Stack
            role="group"
            aria-label={intl.formatMessage({ id: "panel.colocated.label" })}
            gap={2}
            width={{ base: "7.5rem", lg: "9rem" }}
            flexShrink={0}
            overflowY="auto"
        >
            {sensors.map((sensor) => (
                <SensorTile key={sensor.dataLayerId} sensor={sensor} onSelect={onSelect} />
            ))}
        </Stack>
    );
}

function SensorTile(props: { sensor: StaDatastreamProperties; onSelect(sensorId: string): void }) {
    const { sensor, onSelect } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    // Localized name from the data layer configuration, like in the sensor selection.
    const title = useLayerTitle(map, sensor.dataLayerId) ?? sensor.observedProperty ?? sensor.name;
    const latest = useLatestObservation(sensor.observationsUrl);

    const observation = latest.kind === "loaded" ? latest.observation : undefined;
    const value = observation
        ? `${intl.formatNumber(observation.value, { maximumFractionDigits: 2 })}${sensor.unit ? ` ${sensor.unit}` : ""}`
        : intl.formatMessage({ id: "panel.colocated.noValue" });
    const time = observation && intl.formatDate(observation.time, { dateStyle: "short", timeStyle: "short" });
    return (
        <Button
            variant="outline"
            height="auto"
            flexShrink={0}
            padding={2}
            flexDirection="column"
            alignItems="flex-start"
            gap={0.5}
            whiteSpace="normal"
            textAlign="start"
            aria-label={intl.formatMessage(
                { id: "panel.colocated.show" },
                { sensor: title, value: latest.kind === "loading" ? "…" : value }
            )}
            onClick={() => onSelect(sensor.dataLayerId)}
        >
            <Text fontSize="xs" fontWeight="semibold" lineClamp={2}>
                {title}
            </Text>
            {latest.kind === "loading" ? (
                <Spinner size="xs" />
            ) : (
                <Text fontSize="md" fontWeight="semibold">
                    {value}
                </Text>
            )}
            {time && (
                <Text fontSize="2xs" color="fg.muted" fontWeight="normal">
                    {time}
                </Text>
            )}
        </Button>
    );
}

/** Loads the newest observation; errors are logged and shown as missing value. */
function useLatestObservation(observationsUrl: string): LatestState {
    const [state, setState] = useState<LatestState>({ kind: "loading" });
    useEffect(() => {
        const controller = new AbortController();
        setState({ kind: "loading" });
        fetchLatestObservation(observationsUrl, controller.signal)
            .then((observation) => setState({ kind: "loaded", observation }))
            .catch((error: unknown) => {
                if (!isAbortError(error)) {
                    LOG.error(`Failed to load the latest observation of ${observationsUrl}`, error);
                    setState({ kind: "loaded", observation: undefined });
                }
            });
        return () => controller.abort();
    }, [observationsUrl]);
    return state;
}
