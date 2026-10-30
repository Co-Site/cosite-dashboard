import { Box, Flex, IconButton } from "@chakra-ui/react";
import { AnyLayer, isLayer, useMapModelValue, WMSLayer } from "@open-pioneer/map";
import BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import { useIntl } from "open-pioneer:react-hooks";
import { ReactNode } from "react";
import { LuTrash2 } from "react-icons/lu";
import { getDataLayerConfig } from "../dataLayers/createDataLayer";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { wfsLayerColor } from "../dataLayers/wfsStyle";
import { LayerLoadWarning, WatchedSource } from "./LayerLoadWarning";
import { LayerOpacitySlider } from "./LayerOpacitySlider";
import { useUserWmsLayers } from "./useUserWmsLayers";

function RemoveUserLayerButton({ layerId }: { layerId: string }) {
    const intl = useIntl();
    const map = useMapModelValue();
    const userLayers = useUserWmsLayers();
    const title = useLayerTitle(map, layerId) ?? layerId;
    const label = intl.formatMessage({ id: "addWms.remove" }, { title });

    const remove = () => userLayers.remove(layerId);

    return (
        <IconButton size="xs" variant="ghost" aria-label={label} title={label} onClick={remove}>
            <LuTrash2 />
        </IconButton>
    );
}

/** The colour of a WFS layer's features, as a small legend in front of the slider. */
function ColorSwatch({ color }: { color: string }) {
    return (
        <Box
            aria-hidden
            flexShrink={0}
            width={3}
            height={3}
            mb={1}
            borderRadius="sm"
            borderWidth="1px"
            borderColor="border.emphasized"
            backgroundColor={color}
        />
    );
}

interface LayerControlsProps {
    layer: AnyLayer;
    olLayer: BaseLayer;
    source: WatchedSource | undefined;

    /** Colour of the features (WFS layers). */
    color?: string;

    /** Whether the user added the layer in this session (it can be removed). */
    temporary: boolean;
}

/** Load warning, transparency slider and, for the user's layers, a remove button. */
function LayerControls({ layer, olLayer, source, color, temporary }: LayerControlsProps) {
    return (
        <>
            <LayerLoadWarning layer={layer} source={source} />
            <Flex alignItems="flex-end" gap={2}>
                {color && <ColorSwatch color={color} />}
                <Box flex="1">
                    <LayerOpacitySlider olLayer={olLayer} />
                </Box>
                {temporary && <RemoveUserLayerButton layerId={layer.id} />}
            </Flex>
        </>
    );
}

/**
 * Additional content for TOC items of WMS and WFS layers: a transparency slider (with a warning if the layer cannot
 * be loaded), the colour of WFS features, and a remove button for the layers the user added.
 */
export function layerItemContent(layer: AnyLayer): ReactNode {
    const config = getDataLayerConfig(layer);
    if (config?.type === "wms" && layer instanceof WMSLayer) {
        return (
            <LayerControls
                layer={layer}
                olLayer={layer.olLayer}
                source={layer.olSource}
                temporary={!!config.temporary}
            />
        );
    }
    if (config?.type === "wfs" && isLayer(layer) && layer.olLayer instanceof VectorLayer) {
        return (
            <LayerControls
                layer={layer}
                olLayer={layer.olLayer}
                source={layer.olLayer.getSource() ?? undefined}
                color={wfsLayerColor(config)}
                temporary={!!config.temporary}
            />
        );
    }
    return undefined;
}
