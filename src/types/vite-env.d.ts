/**
 * Global log level configured in vite.config.ts
 */
declare const __LOG_LEVEL__: string;

interface ImportMetaEnv {
    /**
     * URL of the data layer configuration (JSON).
     * Defaults to `./config/dataLayers.json` (served from `src/public`).
     */
    readonly VITE_DATA_LAYERS_URL?: string;

    /**
     * How sensors at the same site are recognized: `location` (default), `thing` or `location-or-thing`.
     */
    readonly VITE_SENSOR_GROUPING?: string;
}
