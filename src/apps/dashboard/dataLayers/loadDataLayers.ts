import { DataLayerNode, parseDataLayers } from "./types";

/** URL of the data layer configuration, see `VITE_DATA_LAYERS_URL`. */
export const DATA_LAYERS_URL = import.meta.env.VITE_DATA_LAYERS_URL || "./config/dataLayers.json";

/**
 * Loads and validates the data layer configuration at runtime.
 */
export async function loadDataLayers(url = DATA_LAYERS_URL): Promise<DataLayerNode[]> {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error(
            `Failed to load data layer configuration from ${url}: HTTP ${response.status}`
        );
    }
    return parseDataLayers(await response.json());
}
