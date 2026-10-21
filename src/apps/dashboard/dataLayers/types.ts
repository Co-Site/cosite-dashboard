import { LocalizedText } from "./localizedText";

/** Properties shared by all entries (layers and groups). */
export interface DataLayerNodeBase {
    /** Unique id of the layer or group. */
    id: string;

    /**
     * Human-readable name, shown in the TOC.
     * Required except for WMS layers, which fall back to the title from the service's capabilities.
     */
    name?: LocalizedText;

    /** Longer description, shown as layer info in the TOC. */
    description?: LocalizedText;

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

export interface FeatureInfoField {
    /** Name of the property in the GetFeatureInfo response. */
    property: string;

    /** Label shown in the popup (default: the property name). */
    label?: LocalizedText;

    /** Unit appended to numeric values, e.g. `°C`. */
    unit?: string;
}

export interface WmsFeatureInfoConfig {
    /** Whether GetFeatureInfo is requested on map click (default: `true`). */
    enabled?: boolean;

    /**
     * Response format (GeoJSON), e.g. `application/json` or `application/geo+json`.
     * Default: chosen from the formats in the service's capabilities (no feature info if none fits).
     */
    format?: string;

    /** Properties to show in the popup (default: all properties of the response). */
    fields?: FeatureInfoField[];
}

export interface WmsLegendConfig {
    /** Whether the legend is shown (default: `true`). */
    enabled?: boolean;

    /** Legend image URL. Default: the legend URLs from the service's capabilities. */
    url?: string;

    /**
     * Additional URL parameters for the legend request,
     * e.g. `{ "LEGEND_OPTIONS": "columns:3" }` for a compact GeoServer legend.
     */
    params?: Record<string, string>;
}

/** An OGC Web Map Service. */
export interface WmsDataLayerConfig extends DataLayerConfigBase {
    type: "wms";

    /**
     * Set at runtime for layers the user added in this session (not part of the configuration file).
     * Their capabilities are loaded by the dashboard, see `dataLayers/userWmsLayers.ts`.
     */
    temporary?: boolean;
    wms: {
        /** Names of the WMS layers to request. */
        layers: string[];

        /** GetFeatureInfo on map click (enabled by default). */
        featureInfo?: WmsFeatureInfoConfig;

        /** Legend shown in the feature info popup (enabled by default). */
        legend?: WmsLegendConfig;
    };
}

/** A single OGC SensorThings API datastream, e.g. `.../v1.1/Datastreams(14)`. */
export interface StaDatastreamLayerConfig extends DataLayerConfigBase {
    type: "sta-datastream";
    name: LocalizedText;
}

/** A category that groups other layers (shown as a group in the TOC). */
export interface DataLayerGroupConfig extends DataLayerNodeBase {
    type: "group";
    name: LocalizedText;
    layers: DataLayerNode[];
}

export type DataLayerConfig = WmsDataLayerConfig | StaDatastreamLayerConfig;

export type DataLayerNode = DataLayerConfig | DataLayerGroupConfig;

export type DataLayerType = DataLayerNode["type"];
