// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger } from "@open-pioneer/core";

const LOG = createLogger("dashboard:dataLayers");

/** Properties shared by all entries (layers and groups). */
export interface DataLayerNodeBase {
    /** Unique id of the layer or group. */
    id: string;

    /** Human-readable name, shown in the TOC. */
    name: string;

    /** Longer description, shown as layer info in the TOC. */
    description?: string;

    /** Whether the layer is initially visible (default: `true`). */
    visible?: boolean;

    /** Layer opacity between 0 and 1 (default: `1`). */
    opacity?: number;
}

/** Properties shared by all data layer types. */
export interface DataLayerConfigBase extends DataLayerNodeBase {
    /** Service endpoint (base URL of the service or resource). */
    endpoint: string;

    /** Attribution text shown on the map. */
    attribution?: string;
}

/** An OGC Web Map Service. */
export interface WmsDataLayerConfig extends DataLayerConfigBase {
    type: "wms";
    wms: {
        /** Names of the WMS layers to request. */
        layers: string[];
    };
}

/** A single OGC SensorThings API datastream, e.g. `.../v1.1/Datastreams(14)`. */
export interface StaDatastreamLayerConfig extends DataLayerConfigBase {
    type: "sta-datastream";
}

/** A category that groups other layers (shown as a group in the TOC). */
export interface DataLayerGroupConfig extends DataLayerNodeBase {
    type: "group";
    layers: DataLayerNode[];
}

export type DataLayerConfig = WmsDataLayerConfig | StaDatastreamLayerConfig;

export type DataLayerNode = DataLayerConfig | DataLayerGroupConfig;

export type DataLayerType = DataLayerNode["type"];

/**
 * Validates the content of a data layer configuration file.
 *
 * Invalid entries are skipped with a warning so that a single broken entry
 * does not prevent the remaining layers from being shown.
 */
export function parseDataLayers(json: unknown): DataLayerNode[] {
    if (!isObject(json) || !Array.isArray(json.layers)) {
        throw new Error(
            "Invalid data layer configuration: expected an object with a 'layers' array."
        );
    }
    return parseNodes(json.layers, "layers", new Set());
}

function parseNodes(entries: unknown[], path: string, ids: Set<string>): DataLayerNode[] {
    const result: DataLayerNode[] = [];
    entries.forEach((entry, index) => {
        const entryPath = `${path}[${index}]`;
        const problem = validateEntry(entry);
        if (problem) {
            LOG.warn(`Skipping data layer at ${entryPath}: ${problem}`);
            return;
        }
        const node = entry as DataLayerNode;
        if (ids.has(node.id)) {
            LOG.warn(`Skipping data layer at ${entryPath}: duplicate id '${node.id}'.`);
            return;
        }
        ids.add(node.id);
        if (node.type === "group") {
            const layers = parseNodes(node.layers, `${entryPath}.layers`, ids);
            result.push({ ...node, layers });
        } else {
            result.push(node);
        }
    });
    return result;
}

function validateEntry(entry: unknown): string | undefined {
    if (!isObject(entry)) {
        return "entry is not an object.";
    }
    for (const key of ["id", "type", "name"]) {
        if (typeof entry[key] !== "string" || entry[key] === "") {
            return `missing or invalid property '${key}'.`;
        }
    }
    for (const key of ["description", "attribution"]) {
        if (entry[key] != null && typeof entry[key] !== "string") {
            return `property '${key}' must be a string.`;
        }
    }
    if (entry.visible != null && typeof entry.visible !== "boolean") {
        return "property 'visible' must be a boolean.";
    }
    if (
        entry.opacity != null &&
        (typeof entry.opacity !== "number" || entry.opacity < 0 || entry.opacity > 1)
    ) {
        return "property 'opacity' must be a number between 0 and 1.";
    }

    const type = entry.type as DataLayerType;
    if (type === "group") {
        return Array.isArray(entry.layers)
            ? undefined
            : "groups require 'layers' (list of layers or groups).";
    }

    if (typeof entry.endpoint !== "string" || entry.endpoint === "") {
        return "missing or invalid property 'endpoint'.";
    }
    switch (type) {
        case "wms": {
            const wms = entry.wms;
            if (
                !isObject(wms) ||
                !Array.isArray(wms.layers) ||
                wms.layers.length === 0 ||
                !wms.layers.every((name) => typeof name === "string")
            ) {
                return "wms layers require 'wms.layers' (non-empty list of layer names).";
            }
            return undefined;
        }
        case "sta-datastream":
            return undefined;
        default:
            return `unknown type '${String(entry.type)}'.`;
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
