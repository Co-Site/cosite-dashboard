import { Flex, Slider } from "@chakra-ui/react";
import BaseLayer from "ol/layer/Base";
import { unByKey } from "ol/Observable";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useState } from "react";

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
