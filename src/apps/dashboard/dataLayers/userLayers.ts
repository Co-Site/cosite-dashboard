import { AddLayerOptions, AnyLayer, isLayer, Layer, MapModel } from "@open-pioneer/map";
import { LocalizedText } from "./config/localizedText";
import { DataLayerNode, WfsDataLayerConfig, WmsDataLayerConfig } from "./config/types";
import { createDataLayer } from "./createDataLayer";
import { DataLayerContext, getDataLayerConfig } from "./dataLayerBase";

/** Kinds of services the user can add layers from. */
export type UserLayerKind = "wms" | "wfs";

/** A layer the user added in this session (with `temporary: true`). */
export type UserLayerConfig = WmsDataLayerConfig | WfsDataLayerConfig;

const GROUP_NAMES: Record<UserLayerKind, LocalizedText> = {
    wms: { de: "Eigene WMS", en: "Own WMS" },
    wfs: { de: "Eigene WFS", en: "Own WFS" }
};

/** Takes over visibility and opacity of the layer into its config. */
function withLayerState(config: UserLayerConfig, layer: AnyLayer | undefined): UserLayerConfig {
    if (!layer || !isLayer(layer)) {
        return config;
    }
    return { ...config, visible: layer.visible, opacity: layer.olLayer.getOpacity() };
}

/** Whether the config shows the given layer (WMS) or feature type (WFS) of its service. */
function showsLayer(config: UserLayerConfig, layerName: string): boolean {
    return config.type === "wms" ? config.wms.layers.includes(layerName) : config.wfs.featureType === layerName;
}

/** The top-level layers of the map (except `excludeId`) that are or contain a matching layer, bottommost first. */
function topLevelLayersContaining(
    map: MapModel,
    matches: (config: DataLayerNode) => boolean,
    excludeId: string
): Layer[] {
    return map.layers
        .getOperationalLayers({ sortByDisplayOrder: true })
        .filter((layer): layer is Layer => isLayer(layer) && layer.id !== excludeId)
        .filter((layer) =>
            [layer, ...(layer.layers?.getRecursiveLayers() ?? [])].some((candidate) => {
                const config = getDataLayerConfig(candidate);
                return !!config && matches(config);
            })
        );
}

/**
 * Where the group goes:
 * - WMS directly below the bottommost configured WMS layer (e.g. the group "WMS"),
 * - WFS directly above the topmost layer with WMS layers (configured or the user's): features above the map images,
 *   which would cover them otherwise.
 */
function placement(map: MapModel, kind: UserLayerKind, groupId: string): AddLayerOptions {
    if (kind === "wms") {
        const isConfiguredWms = (config: DataLayerNode) => config.type === "wms" && !config.temporary;
        const [reference] = topLevelLayersContaining(map, isConfiguredWms, groupId);
        return reference ? { at: "below", reference } : { at: "bottom" };
    }
    const reference = topLevelLayersContaining(map, (config) => config.type === "wms", groupId).at(-1);
    return reference ? { at: "above", reference } : { at: "top" };
}

/**
 * The layers the user added in this session from one kind of service (nothing is stored, a reload removes them).
 *
 * They are shown in a group of their own (e.g. "Eigene WMS"). Groups of `@open-pioneer/map` cannot get new children,
 * so the group is rebuilt on every change; visibility and opacity of the layers are kept.
 */
class UserLayers {
    #map: MapModel;
    #kind: UserLayerKind;
    #groupId: string;
    #configs: UserLayerConfig[] = [];

    constructor(map: MapModel, kind: UserLayerKind) {
        this.#map = map;
        this.#kind = kind;
        this.#groupId = `user-${kind}`;
    }

    /** Whether the layer (or feature type) of the service has been added already. */
    has(endpoint: string, layerName: string): boolean {
        return this.#configs.some((config) => config.endpoint === endpoint && showsLayer(config, layerName));
    }

    add(config: UserLayerConfig, context: DataLayerContext): void {
        this.#rebuild([...this.#currentConfigs(), config], context);
    }

    remove(id: string, context: DataLayerContext): void {
        this.#rebuild(
            this.#currentConfigs().filter((config) => config.id !== id),
            context
        );
    }

    /** The configs with the current state of their layers (the user may have changed it in the TOC). */
    #currentConfigs(): UserLayerConfig[] {
        return this.#configs.map((config) => withLayerState(config, this.#map.layers.getLayerById(config.id)));
    }

    #rebuild(configs: UserLayerConfig[], context: DataLayerContext): void {
        const layers = this.#map.layers;
        const oldGroup = layers.getLayerById(this.#groupId);
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
                id: this.#groupId,
                type: "group",
                name: GROUP_NAMES[this.#kind],
                visible: oldGroup?.visible ?? true,
                // The last child is drawn on top and listed first in the TOC: the newest layer.
                layers: configs
            },
            context
        );
        layers.addLayer(group, placement(this.#map, this.#kind, this.#groupId));
    }
}

const instances = new WeakMap<MapModel, Record<UserLayerKind, UserLayers>>();

/** The user's layers of the map from one kind of service (one instance per map and kind). */
export function getUserLayers(map: MapModel, kind: UserLayerKind): UserLayers {
    let instance = instances.get(map);
    if (!instance) {
        instance = { wms: new UserLayers(map, "wms"), wfs: new UserLayers(map, "wfs") };
        instances.set(map, instance);
    }
    return instance[kind];
}
