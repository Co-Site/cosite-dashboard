import { createLogger } from "@open-pioneer/core";
import { MapModel } from "@open-pioneer/map";
import {
    fetchWfsCapabilities,
    probeWfsFeatureType,
    resolveWfsRequest,
    WfsCapabilities,
    WfsFeatureType
} from "../dataLayers/ows/wfsCapabilities";
import { userWfsLayerConfig } from "../dataLayers/ows/wfsLayer";
import { paletteColor } from "../dataLayers/ows/wfsStyle";
import {
    fetchWmsCapabilities,
    probeWmsLayer,
    WmsCapabilities,
    WmsCapabilitiesLayer
} from "../dataLayers/ows/wmsCapabilities";
import { userWmsLayerConfig } from "../dataLayers/ows/wmsLayer";
import { UserLayerConfig, UserLayerKind } from "../dataLayers/userLayers";
import { SearchOption } from "./LayerSearch";

const LOG = createLogger("dashboard:userServices");

/** Why a layer cannot be added: a text below the service's message prefix, with its values. */
export interface CheckFailure {
    messageId: string;

    /** Error message of the service, shown in the text. */
    message?: string;
}

/** The failure for a layer the service cannot deliver, logged with the service's message. */
function notRequestable(endpoint: string, layerName: string, message: string): CheckFailure {
    LOG.warn(`'${layerName}' of ${endpoint} cannot be requested: ${message}`);
    return { messageId: "error.notRequestable", message };
}

/**
 * What differs between the kinds of services the user can add layers from (see `AddServiceLayer.tsx`):
 * how the capabilities are loaded, which entries can be added, how an entry is checked and turned into a layer.
 */
export interface UserService<Capabilities, Entry extends SearchOption> {
    kind: UserLayerKind;

    /** Prefix of the texts specific to the kind (shared texts are below `addService`). */
    messages: string;

    fetchCapabilities(endpoint: string): Promise<Capabilities>;

    /** The entries the user can choose from, in document order. */
    entries(capabilities: Capabilities): Entry[];

    /** Checks an entry before it is added; resolves to the reason if it cannot be added. */
    check(endpoint: string, capabilities: Capabilities, entry: Entry, map: MapModel): Promise<CheckFailure | undefined>;

    /** The configuration of the new layer. */
    input(endpoint: string, capabilities: Capabilities, entry: Entry): UserLayerConfig;
}

/** Layers of a Web Map Service. */
export const WMS_SERVICE: UserService<WmsCapabilities, WmsCapabilitiesLayer> = {
    kind: "wms",
    messages: "addWms",
    fetchCapabilities: fetchWmsCapabilities,
    entries: (capabilities) => capabilities.layers,
    async check(endpoint, _capabilities, layer, map) {
        if (!layer.supportsMapProjection) {
            return { messageId: "error.projection" };
        }
        // Some services list layers that cannot be requested (e.g. folders with a name).
        const center = (map.olMap.getView().getCenter() ?? [0, 0]) as [number, number];
        const message = await probeWmsLayer(endpoint, layer.name, center);
        return message === undefined ? undefined : notRequestable(endpoint, layer.name, message);
    },
    input: userWmsLayerConfig
};

/** Colour of the next WFS layer the user adds: the palette in order (session only). */
let nextColor = 0;

/** Feature types of a Web Feature Service. */
export const WFS_SERVICE: UserService<WfsCapabilities, WfsFeatureType> = {
    kind: "wfs",
    messages: "addWfs",
    fetchCapabilities: fetchWfsCapabilities,
    entries: (capabilities) => capabilities.featureTypes,
    async check(endpoint, capabilities, featureType) {
        const settings = resolveWfsRequest({ featureType: featureType.name }, capabilities);
        if (!settings) {
            LOG.warn(`Feature type '${featureType.name}' of ${endpoint} has no GeoJSON or GML output.`);
            return { messageId: "error.noFormat" };
        }
        // Not every service can deliver every feature type in the chosen format and CRS.
        const message = await probeWfsFeatureType(endpoint, settings);
        return message === undefined ? undefined : notRequestable(endpoint, featureType.name, message);
    },
    input: (endpoint, capabilities, featureType) =>
        userWfsLayerConfig(endpoint, capabilities, featureType, paletteColor(nextColor++))
};
