import { Box, Flex, IconButton } from "@chakra-ui/react";
import { AnyLayer, useMapModelValue, WMSLayer } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { ReactNode } from "react";
import { LuTrash2 } from "react-icons/lu";
import { getDataLayerConfig } from "../dataLayers/createDataLayer";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { LayerLoadWarning } from "./LayerLoadWarning";
import { LayerOpacitySlider } from "./LayerOpacitySlider";
import { useUserWmsLayers } from "./useUserWmsLayers";

function RemoveUserLayerButton({ layerId }: { layerId: string }) {
    const intl = useIntl();
    const map = useMapModelValue();
    const userLayers = useUserWmsLayers();
    const title = useLayerTitle(map, layerId) ?? layerId;
    const label = intl.formatMessage({ id: "addWms.remove" }, { title });
    return (
        <IconButton
            size="xs"
            variant="ghost"
            aria-label={label}
            title={label}
            onClick={() => userLayers.remove(layerId)}
        >
            <LuTrash2 />
        </IconButton>
    );
}

/**
 * Additional content for TOC items: a transparency slider below every WMS layer (with a warning if its map image
 * cannot be loaded), and a remove button for the layers the user added.
 */
export function layerItemContent(layer: AnyLayer): ReactNode {
    const config = getDataLayerConfig(layer);
    if (config?.type !== "wms" || !(layer instanceof WMSLayer)) {
        return undefined;
    }
    const slider = <LayerOpacitySlider olLayer={layer.olLayer} />;
    return (
        <>
            <LayerLoadWarning layer={layer} />
            {config.temporary ? (
                <Flex alignItems="flex-end" gap={2}>
                    <Box flex="1">{slider}</Box>
                    <RemoveUserLayerButton layerId={layer.id} />
                </Flex>
            ) : (
                slider
            )}
        </>
    );
}
