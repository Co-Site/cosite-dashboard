import { LocalizedText } from "./localizedText";

/** Properties shared by all entries (layers and groups). */
export interface DataLayerNodeBase {
    /** Unique id of the layer or group. */
    id: string;

    /**
     * Human-readable name, shown in the TOC.
     * Required except for WMS and WFS layers, which fall back to the title from the service's capabilities.
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
    /**
     * Service endpoint (base URL of the service or resource).
     * A relative URL (e.g. `./proxy/leverkusen/GCGisService`) is resolved against the URL of the app.
     */
    endpoint: string;

    /** Attribution text shown on the map. */
    attribution?: string;

    /**
     * Set at runtime for layers the user added in this session (not part of the configuration file).
     * Their capabilities are loaded by the dashboard, see `dataLayers/userLayers.ts`.
     */
    temporary?: boolean;
}

export interface FeatureInfoField {
    /** Name of the feature property (in the GetFeatureInfo response or of the WFS feature). */
    property: string;

    /** Label shown in the popup (default: the property name). */
    label?: LocalizedText;

    /** Unit appended to numeric values, e.g. `°C`. */
    unit?: string;
}

/** Attributes of the clicked features, shown in the popup. */
export interface FeatureInfoConfig {
    /** Whether the features are shown on map click (default: `true`). */
    enabled?: boolean;

    /** Properties to show in the popup (default: all properties of the feature). */
    fields?: FeatureInfoField[];
}

export interface WmsFeatureInfoConfig extends FeatureInfoConfig {
    /**
     * Response format (GeoJSON), e.g. `application/json` or `application/geo+json`.
     * Default: chosen from the formats in the service's capabilities (no feature info if none fits).
     */
    format?: string;
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
    wms: {
        /** Names of the WMS layers to request. */
        layers: string[];

        /** GetFeatureInfo on map click (enabled by default). */
        featureInfo?: WmsFeatureInfoConfig;

        /** Legend shown in the feature info popup (enabled by default). */
        legend?: WmsLegendConfig;
    };
}

/** WFS versions the dashboard can request, in order of preference. */
export const WFS_VERSIONS = ["2.0.0", "1.1.0"] as const;

export type WfsVersion = (typeof WFS_VERSIONS)[number];

/** A feature type of an OGC Web Feature Service, drawn as vector layer. */
export interface WfsDataLayerConfig extends DataLayerConfigBase {
    type: "wfs";
    wfs: {
        /** Name of the feature type, e.g. `de.hh.up:verwaltungsgrenzen`. */
        featureType: string;

        /** WFS version (default: the newest one the service offers). */
        version?: WfsVersion;

        /**
         * Output format of GetFeature, e.g. `application/json` or `application/gml+xml; version=3.2`.
         * Default: chosen from the service's capabilities (GeoJSON before GML).
         */
        outputFormat?: string;

        /** Maximum number of features per request (default: 1000). */
        maxFeatures?: number;

        /** Colour of the features as CSS colour (default: derived from the layer id). */
        color?: string;

        /** Attributes of the clicked features (enabled by default). */
        featureInfo?: FeatureInfoConfig;
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

export type DataLayerConfig = WmsDataLayerConfig | WfsDataLayerConfig | StaDatastreamLayerConfig;

export type DataLayerNode = DataLayerConfig | DataLayerGroupConfig;

export type DataLayerType = DataLayerNode["type"];
