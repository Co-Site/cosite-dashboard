import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { MapModel } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { LuChartLine } from "react-icons/lu";
import { StaDatastreamProperties } from "../dataLayers/sta";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { PopupFrame } from "./PopupFrame";

export interface SensorPopupProps {
    map: MapModel;
    /** All sensors at the clicked position. */
    datastreams: StaDatastreamProperties[];
    maxHeight: number;
    onClose(): void;
    /** Called to show the sensor (data layer id) in the analysis panel. */
    onShow(dataLayerId: string): void;
}

function SensorEntry(props: { map: MapModel; datastream: StaDatastreamProperties; onShow(dataLayerId: string): void }) {
    const { map, datastream, onShow } = props;
    const intl = useIntl();
    // Localized name from the data layer configuration; the datastream name comes from the server.
    const title = useLayerTitle(map, datastream.dataLayerId) ?? datastream.name;
    const details = [datastream.observedProperty, datastream.thing].filter(Boolean).join(" · ");

    const show = () => onShow(datastream.dataLayerId);

    return (
        <Box>
            <Text fontSize="sm" fontWeight="semibold">
                {title}
            </Text>
            {details && (
                <Text fontSize="xs" color="fg.muted">
                    {details}
                </Text>
            )}
            <Button size="xs" variant="outline" mt={1} onClick={show}>
                <LuChartLine />
                {intl.formatMessage({ id: "sensorPopup.show" })}
            </Button>
        </Box>
    );
}

/**
 * Lists the sensors at the clicked position (several sensors may share a location).
 */
export function SensorPopup({ map, datastreams, maxHeight, onClose, onShow }: SensorPopupProps) {
    const intl = useIntl();
    return (
        <PopupFrame title={intl.formatMessage({ id: "sensorPopup.title" })} maxHeight={maxHeight} onClose={onClose}>
            <Stack gap={3}>
                {datastreams.map((datastream) => (
                    <SensorEntry key={datastream.dataLayerId} map={map} datastream={datastream} onShow={onShow} />
                ))}
            </Stack>
        </PopupFrame>
    );
}
