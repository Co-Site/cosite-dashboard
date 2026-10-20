import { Flex } from "@chakra-ui/react";
import { WMSLayer } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { unByKey } from "ol/Observable";
import ImageWMS from "ol/source/ImageWMS";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";

/**
 * Warning in the TOC while the map image of a visible WMS layer cannot be loaded
 * (e.g. the service is down or rejects the layer). Disappears once an image loads again.
 *
 * The layer's `loadState` does not help here: `@open-pioneer/map` only sets it for errors during initialization.
 */
export function LayerLoadWarning({ layer }: { layer: WMSLayer }) {
    const intl = useIntl();
    const failed = useImageLoadError(layer.olSource);
    const visible = useReactiveSnapshot(() => layer.visible, [layer]);
    return (
        // The status region stays in place so that screen readers announce the warning when it appears.
        <Flex role="status" alignItems="center" gap={1} fontSize="xs" color="fg.warning">
            {failed && visible && (
                <>
                    <LuTriangleAlert aria-hidden />
                    {intl.formatMessage({ id: "toc.loadError" })}
                </>
            )}
        </Flex>
    );
}

/** Whether the last image request of the source failed. */
function useImageLoadError(source: ImageWMS | undefined): boolean {
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!source) {
            return;
        }
        const keys = [
            source.on("imageloaderror", () => setFailed(true)),
            source.on("imageloadend", () => setFailed(false))
        ];
        return () => unByKey(keys);
    }, [source]);
    return failed;
}
