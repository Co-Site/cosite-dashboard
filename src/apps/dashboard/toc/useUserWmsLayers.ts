import { LayerFactory, useMapModelValue } from "@open-pioneer/map";
import { LocaleService } from "@open-pioneer/runtime";
import { useService } from "open-pioneer:react-hooks";
import { useMemo } from "react";
import { DataLayerContext } from "../dataLayers/createDataLayer";
import { getUserWmsLayers, UserWmsLayerInput } from "../dataLayers/userWmsLayers";
import { PROJECTION } from "../services";

/**
 * Adds and removes the WMS layers of the user (session only), see {@link getUserWmsLayers}.
 */
export function useUserWmsLayers() {
    const map = useMapModelValue();
    const layerFactory = useService<LayerFactory>("map.LayerFactory");
    const localeService = useService<LocaleService>("runtime.LocaleService");
    return useMemo(() => {
        const layers = getUserWmsLayers(map);
        // Read the language when the layers are created, it may have changed since.
        const context = (): DataLayerContext => ({
            layerFactory,
            mapProjection: PROJECTION,
            language: localeService.messageLocale.language
        });
        return {
            has: (endpoint: string, layerName: string) => layers.has(endpoint, layerName),
            add: (input: UserWmsLayerInput) => layers.add(input, context()),
            remove: (id: string) => layers.remove(id, context())
        };
    }, [map, layerFactory, localeService]);
}
