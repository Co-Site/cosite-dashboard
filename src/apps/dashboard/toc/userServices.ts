import { createLogger } from "@open-pioneer/core";
import { MapModel } from "@open-pioneer/map";
import { errorMessage } from "../dataLayers/ows/owsService";
import {
    fetchWfsCapabilities,
    probeWfsFeatureType,
    WfsCapabilities,
    WfsFeatureType
} from "../dataLayers/ows/wfsCapabilities";
import { resolveWfsRequest, userWfsLayerInput, WfsRequestSettings } from "../dataLayers/ows/wfsLayer";
import { paletteColor } from "../dataLayers/ows/wfsStyle";
import {
    fetchWmsCapabilities,
    probeWmsLayer,
    WmsCapabilities,
    WmsCapabilitiesLayer
} from "../dataLayers/ows/wmsCapabilities";
import { userWmsLayerInput } from "../dataLayers/ows/wmsLayer";
import { UserLayerConfigs, UserLayerInput, UserLayerKind } from "../dataLayers/userLayers";
import { SearchOption } from "./LayerSearch";

const LOG = createLogger("dashboard:userServices");

/** Why a layer cannot be added: a text below the service's message prefix, with its values. */
export interface CheckFailure {
    messageId: string;
    values?: Record<string, string>;
}

/**
 * What differs between the kinds of services the user can add layers from (see `AddServiceLayer.tsx`):
 * how the capabilities are loaded, which entries can be added, how an entry is checked and turned into a layer.
 */
export interface UserService<K extends UserLayerKind, Capabilities, Entry extends SearchOption> {
    kind: K;

    /** Prefix of the texts specific to the kind (shared texts are below `addService`). */
    messages: string;

    fetchCapabilities(endpoint: string): Promise<Capabilities>;

    /** The entries the user can choose from, in document order. */
    entries(capabilities: Capabilities): Entry[];

    /** Checks an entry before it is added; resolves to the reason if it cannot be added. */
    check(endpoint: string, capabilities: Capabilities, entry: Entry, map: MapModel): Promise<CheckFailure | undefined>;

    /** The configuration of the new layer. */
    input(endpoint: string, capabilities: Capabilities, entry: Entry): UserLayerInput<UserLayerConfigs[K]>;
}

/** Layers of a Web Map Service. */
export const WMS_SERVICE: UserService<"wms", WmsCapabilities, WmsCapabilitiesLayer> = {
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
        const probe = await probeWmsLayer(endpoint, layer.name, center);
        if (probe.ok) {
            return undefined;
        }
        LOG.warn(`Layer '${layer.name}' of ${endpoint} cannot be requested: ${probe.message}`);
        return { messageId: "error.notRequestable", values: { message: probe.message ?? "" } };
    },
    input: userWmsLayerInput
};

/** Settings for requesting the feature type, or why it cannot be read (no GeoJSON or GML output). */
function requestSettings(capabilities: WfsCapabilities, featureType: WfsFeatureType): WfsRequestSettings | string {
    try {
        return resolveWfsRequest({ featureType: featureType.name }, capabilities);
    } catch (error) {
        return errorMessage(error);
    }
}

/** Colour of the next WFS layer the user adds: the palette in order (session only). */
let nextColor = 0;

/** Feature types of a Web Feature Service. */
export const WFS_SERVICE: UserService<"wfs", WfsCapabilities, WfsFeatureType> = {
    kind: "wfs",
    messages: "addWfs",
    fetchCapabilities: fetchWfsCapabilities,
    entries: (capabilities) => capabilities.featureTypes,
    async check(endpoint, capabilities, featureType) {
        const settings = requestSettings(capabilities, featureType);
        if (typeof settings === "string") {
            LOG.warn(`Feature type '${featureType.name}' of ${endpoint} cannot be read: ${settings}`);
            return { messageId: "error.noFormat" };
        }
        // Not every service can deliver every feature type in the chosen format and CRS.
        const probe = await probeWfsFeatureType({
            endpoint,
            version: settings.version,
            featureType: featureType.name,
            outputFormat: settings.outputFormat,
            srsName: settings.srsName
        });
        if (probe.ok) {
            return undefined;
        }
        LOG.warn(`Feature type '${featureType.name}' of ${endpoint} cannot be requested: ${probe.message}`);
        return { messageId: "error.notRequestable", values: { message: probe.message ?? "" } };
    },
    input: (endpoint, capabilities, featureType) =>
        userWfsLayerInput(endpoint, capabilities, featureType, paletteColor(nextColor++))
};
