import { Box, Flex, IconButton, Slider } from "@chakra-ui/react";
import { AnyLayer, isLayer, useMapModelValue } from "@open-pioneer/map";
import BaseLayer from "ol/layer/Base";
import { unByKey } from "ol/Observable";
import { useIntl } from "open-pioneer:react-hooks";
import { ReactNode, useEffect, useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import { DATA_LAYER_ATTRIBUTE } from "../dataLayers/createDataLayer";
import { DataLayerNode } from "../dataLayers/types";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { useUserWmsLayers } from "./useUserWmsLayers";

/**
 * Additional content for TOC items: a transparency slider below every WMS layer,
 * and a remove button for the layers the user added.
 */
export function layerItemContent(layer: AnyLayer): ReactNode {
    const config = layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
    if (config?.type !== "wms" || !isLayer(layer)) {
        return undefined;
    }
    if (config.temporary) {
        return (
            <Flex alignItems="flex-end" gap={2}>
                <Box flex="1">
                    <LayerOpacitySlider olLayer={layer.olLayer} />
                </Box>
                <RemoveUserLayerButton layerId={layer.id} />
            </Flex>
        );
    }
    return <LayerOpacitySlider olLayer={layer.olLayer} />;
}

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
 * Slider for the transparency of a layer (0 % = opaque, 100 % = invisible).
 */
export function LayerOpacitySlider({ olLayer }: { olLayer: BaseLayer }) {
    const intl = useIntl();
    const transparency = useTransparency(olLayer);

    return (
        <Slider.Root
            size="sm"
            className="layer-opacity-slider"
            min={0}
            max={100}
            step={5}
            value={[transparency]}
            onValueChange={(details) => {
                const value = details.value[0] ?? 0;
                olLayer.setOpacity(1 - value / 100);
            }}
            getAriaValueText={(details) => `${details.value} %`}
        >
            <Flex justifyContent="space-between" fontSize="xs" color="fg.muted">
                <Slider.Label fontSize="xs" fontWeight="normal">
                    {intl.formatMessage({ id: "toc.transparency" })}
                </Slider.Label>
                <Slider.ValueText>{`${transparency} %`}</Slider.ValueText>
            </Flex>
            <Slider.Control>
                <Slider.Track>
                    <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
            </Slider.Control>
        </Slider.Root>
    );
}

/** Transparency in percent, kept in sync with the layer (e.g. if changed elsewhere). */
function useTransparency(olLayer: BaseLayer): number {
    const [opacity, setOpacity] = useState(() => olLayer.getOpacity());
    useEffect(() => {
        const key = olLayer.on("change:opacity", () => setOpacity(olLayer.getOpacity()));
        return () => unByKey(key);
    }, [olLayer]);
    return Math.round((1 - opacity) * 100);
}
