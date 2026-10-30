import { Flex } from "@chakra-ui/react";
import { AnyLayer } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import ImageWMS from "ol/source/ImageWMS";
import VectorSource from "ol/source/Vector";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import { TRUNCATED_PROPERTY } from "../dataLayers/wfsLayer";

/** Source of a layer whose loading the TOC watches: map images of a WMS or features of a WFS. */
export type WatchedSource = ImageWMS | VectorSource;

/** Whether the last request of the source failed (map image or features). */
function useLoadError(source: WatchedSource | undefined): boolean {
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!source) {
            return;
        }
        const fail = () => setFailed(true);
        const succeed = () => setFailed(false);
        const keys: EventsKey[] =
            source instanceof VectorSource
                ? [source.on("featuresloaderror", fail), source.on("featuresloadend", succeed)]
                : [source.on("imageloaderror", fail), source.on("imageloadend", succeed)];
        return () => unByKey(keys);
    }, [source]);
    return failed;
}

/** Whether the last feature request returned the maximum number of features (see `dataLayers/wfsLayer.ts`). */
function useFeatureLimitReached(source: WatchedSource | undefined): boolean {
    const [reached, setReached] = useState(false);
    useEffect(() => {
        if (!(source instanceof VectorSource)) {
            return;
        }
        const update = () => setReached(!!source.get(TRUNCATED_PROPERTY));
        update();
        const key = source.on("propertychange", (event) => {
            if (event.key === TRUNCATED_PROPERTY) {
                update();
            }
        });
        return () => unByKey(key);
    }, [source]);
    return reached;
}

/**
 * Warning in the TOC while a visible layer cannot be loaded (e.g. the service is down or rejects the layer), or
 * while not all features of a WFS layer have been loaded because of the feature limit. Disappears once loading
 * succeeds again.
 *
 * The layer's `loadState` does not help here: `@open-pioneer/map` only sets it for errors during initialization.
 */
export function LayerLoadWarning({ layer, source }: { layer: AnyLayer; source: WatchedSource | undefined }) {
    const intl = useIntl();
    const failed = useLoadError(source);
    const limitReached = useFeatureLimitReached(source);
    const visible = useReactiveSnapshot(() => layer.visible, [layer]);
    const loadErrorId = source instanceof VectorSource ? "toc.featuresLoadError" : "toc.loadError";
    const messageId = failed ? loadErrorId : limitReached ? "toc.featureLimit" : undefined;
    return (
        // The status region stays in place so that screen readers announce the warning when it appears.
        <Flex role="status" alignItems="center" gap={1} fontSize="xs" color="fg.warning">
            {visible && messageId && (
                <>
                    <LuTriangleAlert aria-hidden />
                    {intl.formatMessage({ id: messageId })}
                </>
            )}
        </Flex>
    );
}
