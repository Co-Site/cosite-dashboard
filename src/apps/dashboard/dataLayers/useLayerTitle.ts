import { MapModel } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";

/**
 * Returns the (current, localized) title of a map layer.
 * Updates when the title changes, e.g. after a language change.
 * Cannot be handled by i18n because layer namings are listed in the config not i18n
 */
export function useLayerTitle(map: MapModel, layerId: string): string | undefined {
    return useReactiveSnapshot(() => map.layers.getLayerById(layerId)?.title, [map, layerId]);
}
