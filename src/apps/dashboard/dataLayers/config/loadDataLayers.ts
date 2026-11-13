import { createLogger } from "@open-pioneer/core";
import { isLocalizedText } from "./localizedText";
import { DataLayerNode, DataLayerType, WFS_VERSIONS } from "./types";

const LOG = createLogger("dashboard:dataLayers");

/** URL of the data layer configuration, see `VITE_DATA_LAYERS_URL`. */
export const DATA_LAYERS_URL = import.meta.env.VITE_DATA_LAYERS_URL || "./config/dataLayers.json";

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value !== "";
}

/** Checks `enabled` and `fields` of a feature info configuration at `path` (e.g. `wms.featureInfo`). */
function validateFeatureInfo(featureInfo: unknown, path: string): string | undefined {
    if (featureInfo == null) {
        return undefined;
    }
    if (!isObject(featureInfo)) {
        return `'${path}' must be an object.`;
    }
    if (featureInfo.enabled != null && typeof featureInfo.enabled !== "boolean") {
        return `'${path}.enabled' must be a boolean.`;
    }
    const fields = featureInfo.fields;
    if (fields == null) {
        return undefined;
    }
    const validFields =
        Array.isArray(fields) &&
        fields.every(
            (field) =>
                isObject(field) &&
                typeof field.property === "string" &&
                (field.label == null || isLocalizedText(field.label)) &&
                (field.unit == null || typeof field.unit === "string")
        );
    return validFields ? undefined : `'${path}.fields' must be a list of { property, label?, unit? }.`;
}

function validateWmsFeatureInfo(featureInfo: unknown): string | undefined {
    const problem = validateFeatureInfo(featureInfo, "wms.featureInfo");
    if (problem || !isObject(featureInfo)) {
        return problem;
    }
    if (featureInfo.format != null && !isNonEmptyString(featureInfo.format)) {
        return "'wms.featureInfo.format' must be a format name, e.g. 'application/json'.";
    }
    return undefined;
}

function validateLegend(legend: unknown): string | undefined {
    if (legend == null) {
        return undefined;
    }
    if (!isObject(legend)) {
        return "'wms.legend' must be an object.";
    }
    if (legend.enabled != null && typeof legend.enabled !== "boolean") {
        return "'wms.legend.enabled' must be a boolean.";
    }
    if (legend.url != null && typeof legend.url !== "string") {
        return "'wms.legend.url' must be a string.";
    }
    const params = legend.params;
    if (params != null && (!isObject(params) || !Object.values(params).every((v) => typeof v === "string"))) {
        return "'wms.legend.params' must be an object with string values.";
    }
    return undefined;
}

function validateWfs(wfs: unknown): string | undefined {
    if (!isObject(wfs) || !isNonEmptyString(wfs.featureType)) {
        return "wfs layers require 'wfs.featureType' (name of the feature type).";
    }
    if (wfs.version != null && !WFS_VERSIONS.some((version) => version === wfs.version)) {
        return `'wfs.version' must be one of ${WFS_VERSIONS.map((version) => `'${version}'`).join(", ")}.`;
    }
    if (wfs.outputFormat != null && !isNonEmptyString(wfs.outputFormat)) {
        return "'wfs.outputFormat' must be a format name, e.g. 'application/json'.";
    }
    if (wfs.maxFeatures != null && !(Number.isInteger(wfs.maxFeatures) && (wfs.maxFeatures as number) > 0)) {
        return "'wfs.maxFeatures' must be a positive integer.";
    }
    if (wfs.color != null && !isNonEmptyString(wfs.color)) {
        return "'wfs.color' must be a CSS colour, e.g. '#2b6cb0'.";
    }
    return validateFeatureInfo(wfs.featureInfo, "wfs.featureInfo");
}

function validateEntry(entry: unknown): string | undefined {
    if (!isObject(entry)) {
        return "entry is not an object.";
    }
    for (const key of ["id", "type"]) {
        if (!isNonEmptyString(entry[key])) {
            return `missing or invalid property '${key}'.`;
        }
    }
    // WMS and WFS layers may omit the name (the title from the capabilities is used instead).
    const titleFromCapabilities = entry.type === "wms" || entry.type === "wfs";
    if ((entry.name != null || !titleFromCapabilities) && (!isLocalizedText(entry.name) || entry.name === "")) {
        return "missing or invalid property 'name' (string or object with one string per language).";
    }
    if (entry.description != null && !isLocalizedText(entry.description)) {
        return "property 'description' must be a string or an object with one string per language.";
    }
    if (entry.attribution != null && typeof entry.attribution !== "string") {
        return "property 'attribution' must be a string.";
    }
    if (entry.visible != null && typeof entry.visible !== "boolean") {
        return "property 'visible' must be a boolean.";
    }
    if (entry.opacity != null && (typeof entry.opacity !== "number" || entry.opacity < 0 || entry.opacity > 1)) {
        return "property 'opacity' must be a number between 0 and 1.";
    }

    const type = entry.type as DataLayerType;
    if (type === "group") {
        return Array.isArray(entry.layers) ? undefined : "groups require 'layers' (list of layers or groups).";
    }

    if (!isNonEmptyString(entry.endpoint)) {
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
            return validateWmsFeatureInfo(wms.featureInfo) ?? validateLegend(wms.legend);
        }
        case "wfs":
            return validateWfs(entry.wfs);
        case "sta-datastream":
            for (const key of ["observedProperty", "unit"]) {
                if (entry[key] != null && !isNonEmptyString(entry[key])) {
                    return `property '${key}' must be a non-empty string.`;
                }
            }
            return undefined;
        default:
            return `unknown type '${String(entry.type)}'.`;
    }
}

function parseNodes(entries: unknown[], path: string, ids: Set<string>, baseUrl: string): DataLayerNode[] {
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
            const layers = parseNodes(node.layers, `${entryPath}.layers`, ids, baseUrl);
            result.push({ ...node, layers });
        } else {
            // Relative endpoints (e.g. `./proxy/...`) point to the server that serves the app.
            result.push({ ...node, endpoint: new URL(node.endpoint, baseUrl).href });
        }
    });
    return result;
}

/**
 * Validates the content of a data layer configuration file.
 *
 * Invalid entries are skipped with a warning so that a single broken entry
 * does not prevent the remaining layers from being shown.
 * Relative endpoints are resolved against `baseUrl` (default: the URL of the app).
 */
export function parseDataLayers(json: unknown, baseUrl = document.baseURI): DataLayerNode[] {
    if (!isObject(json) || !Array.isArray(json.layers)) {
        throw new Error("Invalid data layer configuration: expected an object with a 'layers' array.");
    }
    return parseNodes(json.layers, "layers", new Set(), baseUrl);
}

/**
 * Loads and validates the data layer configuration at runtime.
 */
export async function loadDataLayers(url = DATA_LAYERS_URL): Promise<DataLayerNode[]> {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`Failed to load data layer configuration from ${url}: HTTP ${response.status}`);
    }
    return parseDataLayers(await response.json());
}
