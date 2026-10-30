import { AddLayerOptions, AnyLayer, isLayer, Layer, MapModel } from "@open-pioneer/map";
import { LocalizedText } from "./config/localizedText";
import { DataLayerConfig, DataLayerNode, WfsDataLayerConfig, WmsDataLayerConfig } from "./config/types";
import { createDataLayer } from "./createDataLayer";
import { DataLayerContext, getDataLayerConfig } from "./dataLayerBase";

/** The configuration type of the user's layers per kind of service. */
export interface UserLayerConfigs {
    wms: WmsDataLayerConfig;
    wfs: WfsDataLayerConfig;
}

/** Kinds of services the user can add layers from. */
export type UserLayerKind = keyof UserLayerConfigs;

/** What the user chose for a new layer; id, type and `temporary` are assigned here. */
export type UserLayerInput<C extends DataLayerConfig> = Omit<C, "id" | "type" | "temporary">;

/** Takes over visibility and opacity of the layer into its config. */
export function withLayerState<C extends DataLayerConfig>(
    config: C,
    layer: (Pick<AnyLayer, "visible"> & { olLayer?: { getOpacity(): number } }) | undefined
): C {
    if (!layer) {
        return config;
    }
    return { ...config, visible: layer.visible, opacity: layer.olLayer?.getOpacity() ?? config.opacity };
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

/** The group of the user's layers of one service kind. */
interface UserLayerGroup<C extends DataLayerConfig> {
    id: string;
    name: LocalizedText;
    type: C["type"];

    /** Where the group is inserted into the map. */
    placement(map: MapModel): AddLayerOptions;

    /** Whether the config shows the given layer (or feature type) of its service. */
    shows(config: C, layerName: string): boolean;
}

/** The user's WMS layers are inserted directly below the bottommost configured WMS layer (e.g. the group "WMS"). */
const WMS_GROUP: UserLayerGroup<WmsDataLayerConfig> = {
    id: "user-wms",
    name: { de: "Eigene WMS", en: "Own WMS" },
    type: "wms",
    placement(map) {
        const isConfiguredWms = (config: DataLayerNode) => config.type === "wms" && !config.temporary;
        const [reference] = topLevelLayersContaining(map, isConfiguredWms, this.id);
        return reference ? { at: "below", reference } : { at: "bottom" };
    },
    shows: (config, layerName) => config.wms.layers.includes(layerName)
};

/**
 * The user's WFS layers are inserted directly above the topmost layer with WMS layers (configured or the user's):
 * features above the map images, which would cover them otherwise.
 */
const WFS_GROUP: UserLayerGroup<WfsDataLayerConfig> = {
    id: "user-wfs",
    name: { de: "Eigene WFS", en: "Own WFS" },
    type: "wfs",
    placement(map) {
        const reference = topLevelLayersContaining(map, (config) => config.type === "wms", this.id).at(-1);
        return reference ? { at: "above", reference } : { at: "top" };
    },
    shows: (config, featureType) => config.wfs.featureType === featureType
};

/**
 * The layers the user added in this session from one kind of service (nothing is stored, a reload removes them).
 *
 * They are shown in a group of their own (e.g. "Eigene WMS"). Groups of `@open-pioneer/map` cannot get new children,
 * so the group is rebuilt on every change; visibility and opacity of the layers are kept.
 */
export class UserLayers<C extends DataLayerConfig> {
    #map: MapModel;
    #group: UserLayerGroup<C>;
    #configs: C[] = [];
    #nextId = 1;

    constructor(map: MapModel, group: UserLayerGroup<C>) {
        this.#map = map;
        this.#group = group;
    }

    /** Whether the layer of the service has been added already. */
    has(endpoint: string, layerName: string): boolean {
        return this.#configs.some((config) => config.endpoint === endpoint && this.#group.shows(config, layerName));
    }

    /** Adds a layer and returns its id. */
    add(input: UserLayerInput<C>, context: DataLayerContext): string {
        const id = `${this.#group.id}-${this.#nextId++}`;
        const config = { ...input, id, type: this.#group.type, temporary: true } as C;
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
    #currentConfigs(): C[] {
        return this.#configs.map((config) => withLayerState(config, this.#map.layers.getLayerById(config.id)));
    }

    #rebuild(configs: C[], context: DataLayerContext): void {
        const layers = this.#map.layers;
        const oldGroup = layers.getLayerById(this.#group.id);
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
                id: this.#group.id,
                type: "group",
                name: this.#group.name,
                visible: oldGroup?.visible ?? true,
                // The last child is drawn on top and listed first in the TOC: the newest layer.
                layers: configs
            },
            context
        );
        layers.addLayer(group, this.#group.placement(this.#map));
    }
}

/** The user layers of a map per service kind. */
type UserLayersOfMap = { [K in UserLayerKind]: UserLayers<UserLayerConfigs[K]> };

const instances = new WeakMap<MapModel, UserLayersOfMap>();

/** The user's layers of the map from one kind of service (one instance per map and kind). */
export function getUserLayers<K extends UserLayerKind>(map: MapModel, kind: K): UserLayers<UserLayerConfigs[K]> {
    let instance = instances.get(map);
    if (!instance) {
        instance = { wms: new UserLayers(map, WMS_GROUP), wfs: new UserLayers(map, WFS_GROUP) };
        instances.set(map, instance);
    }
    return instance[kind];
}
