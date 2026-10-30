import { LayerFactory, useMapModelValue } from "@open-pioneer/map";
import { LocaleService } from "@open-pioneer/runtime";
import { useService } from "open-pioneer:react-hooks";
import { useMemo } from "react";
import { DataLayerContext } from "../dataLayers/dataLayerBase";
import { getUserLayers, UserLayerConfigs, UserLayerInput, UserLayerKind } from "../dataLayers/userLayers";
import { PROJECTION } from "../services";

/**
 * Adds and removes the user's layers of one kind of service (session only), see {@link getUserLayers}.
 */
export function useUserLayers<K extends UserLayerKind>(kind: K) {
    const map = useMapModelValue();
    const layerFactory = useService<LayerFactory>("map.LayerFactory");
    const localeService = useService<LocaleService>("runtime.LocaleService");
    return useMemo(() => {
        const layers = getUserLayers(map, kind);
        // Read the language when the layers are created, it may have changed since.
        const context = (): DataLayerContext => ({
            layerFactory,
            mapProjection: PROJECTION,
            language: localeService.messageLocale.language
        });
        return {
            has: (endpoint: string, layerName: string) => layers.has(endpoint, layerName),
            add: (input: UserLayerInput<UserLayerConfigs[K]>) => layers.add(input, context()),
            remove: (id: string) => layers.remove(id, context())
        };
    }, [map, kind, layerFactory, localeService]);
}
