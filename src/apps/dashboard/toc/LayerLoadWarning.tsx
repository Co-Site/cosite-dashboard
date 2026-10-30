import { Flex } from "@chakra-ui/react";
import { AnyLayer } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { unByKey } from "ol/Observable";
import ImageWMS from "ol/source/ImageWMS";
import VectorSource from "ol/source/Vector";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import { TRUNCATED_PROPERTY } from "../dataLayers/ows/wfsLayer";

/** Source of a layer whose loading the TOC watches: map images of a WMS or features of a WFS. */
export type WatchedSource = ImageWMS | VectorSource;

/** What the TOC warns about: the last request failed, or (WFS) it returned the maximum number of features. */
type LoadStatus = "failed" | "limitReached" | undefined;

function useLoadStatus(source: WatchedSource | undefined): LoadStatus {
    const [status, setStatus] = useState<LoadStatus>();
    useEffect(() => {
        if (!source) {
            return;
        }
        const fail = () => setStatus("failed");
        if (source instanceof VectorSource) {
            // The WFS loader sets the property before it reports success.
            const succeed = () => setStatus(source.get(TRUNCATED_PROPERTY) ? "limitReached" : undefined);
            const keys = [source.on("featuresloaderror", fail), source.on("featuresloadend", succeed)];
            return () => unByKey(keys);
        }
        const keys = [source.on("imageloaderror", fail), source.on("imageloadend", () => setStatus(undefined))];
        return () => unByKey(keys);
    }, [source]);
    return status;
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
    const status = useLoadStatus(source);
    const visible = useReactiveSnapshot(() => layer.visible, [layer]);
    const loadErrorId = source instanceof VectorSource ? "toc.featuresLoadError" : "toc.loadError";
    const messageId = status === "failed" ? loadErrorId : status === "limitReached" ? "toc.featureLimit" : undefined;
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
