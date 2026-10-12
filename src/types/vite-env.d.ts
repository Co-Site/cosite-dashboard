// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

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
}
