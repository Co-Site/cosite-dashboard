// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { MapModel } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";

/**
 * Returns the (current, localized) title of a map layer.
 * Updates when the title changes, e.g. after a language change.
 */
export function useLayerTitle(map: MapModel, layerId: string): string | undefined {
    return useReactiveSnapshot(() => map.layers.getLayerById(layerId)?.title, [map, layerId]);
}
