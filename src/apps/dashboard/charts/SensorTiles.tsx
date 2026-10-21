import { Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { createLogger, isAbortError } from "@open-pioneer/core";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { RefObject, useEffect, useRef, useState } from "react";
import { fetchLatestObservation, Observation, StaDatastreamProperties } from "../dataLayers/sta";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { createValueFormatter } from "./chartStyle";

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
    const listRef = useRef<HTMLDivElement>(null);
    const moreBelow = useMoreBelow(listRef, sensors);
    return (
        // The column gets the chart's height (stretched by the row), the tiles scroll inside.
        <Flex direction="column" position="relative" width={{ base: "7.5rem", lg: "9rem" }} flexShrink={0}>
            <Stack
                ref={listRef}
                role="group"
                aria-label={intl.formatMessage({ id: "panel.colocated.label" })}
                gap={2}
                flex="1"
                minHeight={0}
                overflowY="auto"
                // Room for the focus ring, which `overflow` would cut off otherwise.
                padding={1}
                // The scrollbar does not change the tiles' width when it appears.
                css={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
            >
                {sensors.map((sensor) => (
                    <SensorTile key={sensor.dataLayerId} sensor={sensor} onSelect={onSelect} />
                ))}
            </Stack>
            {moreBelow && (
                // Hint that more tiles follow below.
                <Box
                    aria-hidden
                    position="absolute"
                    insetX={0}
                    bottom={0}
                    height={8}
                    pointerEvents="none"
                    bgGradient="to-t"
                    gradientFrom="bg"
                    gradientTo="transparent"
                />
            )}
        </Flex>
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
        ? createValueFormatter(intl, sensor.unit)(observation.value)
        : intl.formatMessage({ id: "panel.colocated.noValue" });
    const time = observation && formatTime(intl, observation.time);
    return (
        <Button
            variant="outline"
            height="auto"
            flexShrink={0}
            paddingX={2}
            paddingY={1.5}
            flexDirection="column"
            alignItems="flex-start"
            gap={0}
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
            {/* Value and time share a line if the tile is wide enough. */}
            <Flex wrap="wrap" alignItems="baseline" columnGap={2} minHeight={6}>
                {latest.kind === "loading" ? (
                    <Spinner size="xs" alignSelf="center" />
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
            </Flex>
        </Button>
    );
}

/** Time of the newest value: only the time of day for today, otherwise with the date. */
function formatTime(intl: ReturnType<typeof useIntl>, time: number): string {
    const today = new Date().toDateString() === new Date(time).toDateString();
    return intl.formatDate(
        time,
        today
            ? { hour: "2-digit", minute: "2-digit" }
            : { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }
    );
}

/**
 * Whether the list is scrollable and not scrolled to its end.
 * Updates on scrolling and when the list or a tile changes its size (e.g. when a value has loaded).
 */
function useMoreBelow(listRef: RefObject<HTMLDivElement | null>, sensors: StaDatastreamProperties[]): boolean {
    const [moreBelow, setMoreBelow] = useState(false);
    useEffect(() => {
        const list = listRef.current;
        if (!list) {
            return;
        }
        // 1 px tolerance for fractional sizes.
        const update = () => setMoreBelow(list.scrollTop + list.clientHeight < list.scrollHeight - 1);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(list);
        for (const tile of list.children) {
            observer.observe(tile);
        }
        list.addEventListener("scroll", update, { passive: true });
        return () => {
            observer.disconnect();
            list.removeEventListener("scroll", update);
        };
    }, [listRef, sensors]);
    return moreBelow;
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
