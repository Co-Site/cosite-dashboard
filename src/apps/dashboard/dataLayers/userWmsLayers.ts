import { AnyLayer, isLayer, Layer, MapModel } from "@open-pioneer/map";
import { createDataLayer, DataLayerContext, getDataLayerConfig } from "./createDataLayer";
import { LocalizedText } from "./localizedText";
import { WmsDataLayerConfig } from "./types";
import { chooseFeatureInfoFormat, WmsCapabilities, WmsCapabilitiesLayer } from "./wmsCapabilities";

/** Id of the group that holds the WMS layers added by the user. */
const USER_WMS_GROUP_ID = "user-wms";

const USER_WMS_GROUP_NAME: LocalizedText = { de: "Eigene WMS", en: "Own WMS" };

/** What the user chose for a new layer; id and type are assigned here. */
export type UserWmsLayerInput = Omit<WmsDataLayerConfig, "id" | "type" | "temporary">;

/** Labels of the service information in the layer description (both languages, like the configuration). */
const LABELS = {
    provider: { de: "Anbieter", en: "Provider" },
    constraints: { de: "Nutzungsbedingungen", en: "Terms of use" },
    fees: { de: "Gebühren", en: "Fees" }
};

/** Abstract of the layer and information about the service (provider, terms of use, fees). */
function describe(capabilities: WmsCapabilities, layer: WmsCapabilitiesLayer): LocalizedText | undefined {
    const parts = (language: "de" | "en") =>
        [
            layer.abstract !== layer.title ? layer.abstract : undefined,
            capabilities.contactOrganization && `${LABELS.provider[language]}: ${capabilities.contactOrganization}`,
            capabilities.accessConstraints && `${LABELS.constraints[language]}: ${capabilities.accessConstraints}`,
            capabilities.fees && `${LABELS.fees[language]}: ${capabilities.fees}`
        ]
            .filter(Boolean)
            .join("\n\n");
    const de = parts("de");
    return de ? { de, en: parts("en") } : undefined;
}

/** Builds the configuration of a user layer from the capabilities of its service. */
export function userWmsLayerInput(
    endpoint: string,
    capabilities: WmsCapabilities,
    layer: WmsCapabilitiesLayer
): UserWmsLayerInput {
    const format = layer.queryable ? chooseFeatureInfoFormat(capabilities.featureInfoFormats) : undefined;
    return {
        name: layer.title,
        description: describe(capabilities, layer),
        endpoint,
        attribution: layer.attribution,
        wms: {
            layers: [layer.name],
            featureInfo: format ? { format } : { enabled: false }
        }
    };
}

/** Takes over visibility and opacity of the layer into its config. */
export function withLayerState(
    config: WmsDataLayerConfig,
    layer: (Pick<AnyLayer, "visible"> & { olLayer?: { getOpacity(): number } }) | undefined
): WmsDataLayerConfig {
    if (!layer) {
        return config;
    }
    return { ...config, visible: layer.visible, opacity: layer.olLayer?.getOpacity() ?? config.opacity };
}

/**
 * The bottommost top-level layer that is or contains a configured WMS layer (e.g. the group "WMS").
 * The user's layers are inserted directly below it.
 */
function findConfiguredWmsLayer(map: MapModel): Layer | undefined {
    // Sorted by display order: bottommost first.
    return map.layers
        .getOperationalLayers({ sortByDisplayOrder: true })
        .filter((layer): layer is Layer => isLayer(layer) && layer.id !== USER_WMS_GROUP_ID)
        .find((layer) =>
            [layer, ...(layer.layers?.getRecursiveLayers() ?? [])].some((candidate) => {
                const config = getDataLayerConfig(candidate);
                return config?.type === "wms" && !config.temporary;
            })
        );
}

/**
 * The WMS layers the user added in this session (nothing is stored, a reload removes them).
 *
 * They are shown in the group "Eigene WMS" directly below the configured WMS layers.
 * Groups of `@open-pioneer/map` cannot get new children, so the group is rebuilt on every change;
 * visibility and opacity of the layers are kept.
 */
class UserWmsLayers {
    #map: MapModel;
    #configs: WmsDataLayerConfig[] = [];
    #nextId = 1;

    constructor(map: MapModel) {
        this.#map = map;
    }

    /** Whether the layer of the service has been added already. */
    has(endpoint: string, layerName: string): boolean {
        return this.#configs.some((config) => config.endpoint === endpoint && config.wms.layers.includes(layerName));
    }

    /** Adds a layer and returns its id. */
    add(input: UserWmsLayerInput, context: DataLayerContext): string {
        const id = `${USER_WMS_GROUP_ID}-${this.#nextId++}`;
        const config: WmsDataLayerConfig = { ...input, id, type: "wms", temporary: true };
        this.#rebuild([...this.#currentConfigs(), config], context);
        return id;
    }

    remove(id: string, context: DataLayerContext): void {
        this.#rebuild(
            this.#currentConfigs().filter((config) => config.id !== id),
            context
        );
    }

    /** The configs with the current state of their layers (the user may have changed it in the TOC). */
    #currentConfigs(): WmsDataLayerConfig[] {
        return this.#configs.map((config) => withLayerState(config, this.#map.layers.getLayerById(config.id)));
    }

    #rebuild(configs: WmsDataLayerConfig[], context: DataLayerContext): void {
        const layers = this.#map.layers;
        const oldGroup = layers.getLayerById(USER_WMS_GROUP_ID);
        if (oldGroup && isLayer(oldGroup)) {
            layers.removeLayer(oldGroup);
            oldGroup.destroy();
        }
        this.#configs = configs;
        if (configs.length === 0) {
            return;
        }

        const group = createDataLayer(
            {
                id: USER_WMS_GROUP_ID,
                type: "group",
                name: USER_WMS_GROUP_NAME,
                visible: oldGroup?.visible ?? true,
                // The last child is drawn on top and listed first in the TOC: the newest layer.
                layers: configs
            },
            context
        );
        const reference = findConfiguredWmsLayer(this.#map);
        layers.addLayer(group, reference ? { at: "below", reference } : { at: "bottom" });
    }
}

const instances = new WeakMap<MapModel, UserWmsLayers>();

/** The user's WMS layers of the map (one instance per map). */
export function getUserWmsLayers(map: MapModel): UserWmsLayers {
    let instance = instances.get(map);
    if (!instance) {
        instance = new UserWmsLayers(map);
        instances.set(map, instance);
    }
    return instance;
}
