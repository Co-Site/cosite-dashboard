/*
 * WFS layers: which version, output format and CRS are requested, how the features are read (GeoJSON or GML),
 * how they are loaded for the visible extent, and the map layer itself.
 */
import { createLogger } from "@open-pioneer/core";
import { Layer, SimpleLayer } from "@open-pioneer/map";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import GML2 from "ol/format/GML2";
import GML3 from "ol/format/GML3";
import GML32 from "ol/format/GML32";
import WFS from "ol/format/WFS";
import VectorLayer from "ol/layer/Vector";
import { bbox } from "ol/loadingstrategy";
import { transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { WfsDataLayerConfig } from "../config/types";
import { applyCapabilitiesTitle, commonOptions, DataLayerContext } from "../dataLayerBase";
import { describeLayer, exceptionMessage } from "./owsService";
import {
    FeatureEncoding,
    fetchWfsCapabilities,
    getFeatureUrl,
    namePrefix,
    resolveWfsRequest,
    WfsCapabilities,
    WfsFeatureType,
    WfsRequestSettings
} from "./wfsCapabilities";
import { createWfsStyle, wfsLayerColor } from "./wfsStyle";

const LOG = createLogger("dashboard:wfsLayer");

/** Maximum number of features per request if the configuration sets none. */
export const DEFAULT_MAX_FEATURES = 1000;

/** Source property: whether the last request returned the maximum number of features (so some may be missing). */
export const TRUNCATED_PROPERTY = "truncated";

const GML_FORMATS = { gml32: GML32, gml3: GML3, gml2: GML2 };

/** GML reader with the feature type's namespace if the capabilities declare it. */
function createGmlFormat(settings: WfsRequestSettings, encoding: Exclude<FeatureEncoding, "geojson">): WFS {
    const { version, featureType } = settings;
    const prefix = namePrefix(featureType.name);
    const { namespace } = featureType;
    // Without both, OpenLayers detects the feature type from the response.
    const known = prefix && namespace ? { featureType: featureType.name, featureNS: { [prefix]: namespace } } : {};
    return new WFS({ version, gmlFormat: new GML_FORMATS[encoding](), ...known });
}

/** Reads the features of a GetFeature response and transforms them into the map projection. */
export function readFeatures(body: string, settings: WfsRequestSettings, mapProjection: string): Feature[] {
    const options = { dataProjection: settings.dataProjection, featureProjection: mapProjection };
    const { encoding } = settings;
    if (encoding !== "geojson") {
        return createGmlFormat(settings, encoding).readFeatures(body, options) as Feature[];
    }
    const json = JSON.parse(body) as { features?: unknown };
    // deegree omits `features` if nothing matches.
    return Array.isArray(json.features) ? new GeoJSON().readFeatures(json, options) : [];
}

/** Requests the features within `extent` (in the map projection) and returns the response text. */
async function requestFeatures(
    config: WfsDataLayerConfig,
    settings: WfsRequestSettings,
    extent: number[],
    mapProjection: string
): Promise<string> {
    const url = getFeatureUrl(
        config.endpoint,
        settings,
        config.wfs.maxFeatures ?? DEFAULT_MAX_FEATURES,
        transformExtent(extent, mapProjection, settings.dataProjection)
    );
    const response = await fetch(url);
    const body = await response.text();
    // Services report errors with HTTP 200 and an exception report.
    const exception = exceptionMessage(body);
    if (!response.ok || exception) {
        throw new Error(exception ?? `HTTP ${response.status}`);
    }
    return body;
}

/**
 * The vector source of a WFS layer. Features are loaded for the visible extent (`bbox` strategy) with at most
 * `maxFeatures` per request; {@link TRUNCATED_PROPERTY} tells whether the limit was hit. Failed requests fire
 * `featuresloaderror`; their extent counts as loaded, so it is requested again only when the view shows more
 * (retrying at once would repeat a broken request in a loop).
 */
export function createWfsSource(config: WfsDataLayerConfig): VectorSource {
    let settings: Promise<WfsRequestSettings> | undefined;
    const source: VectorSource = new VectorSource({
        attributions: config.attribution,
        strategy: bbox,
        // The signature is given by OpenLayers.
        // oxlint-disable-next-line max-params
        loader: (extent, _resolution, projection, success, failure) => {
            settings ??= fetchWfsCapabilities(config.endpoint).then((capabilities) => {
                const resolved = resolveWfsRequest(config.wfs, capabilities);
                if (!resolved) {
                    throw new Error(`Feature type '${config.wfs.featureType}' is not offered or not readable.`);
                }
                return resolved;
            });
            const mapProjection = projection.getCode();
            settings
                .then(async (resolved) =>
                    readFeatures(
                        await requestFeatures(config, resolved, extent, mapProjection),
                        resolved,
                        mapProjection
                    )
                )
                .then((features) => {
                    source.addFeatures(features);
                    source.set(TRUNCATED_PROPERTY, features.length >= (config.wfs.maxFeatures ?? DEFAULT_MAX_FEATURES));
                    success?.(features);
                })
                .catch((error: unknown) => {
                    LOG.warn(`Failed to load features of '${config.id}'.`, error);
                    // A rejected capabilities request is not cached, the next attempt loads it again.
                    settings = undefined;
                    failure?.();
                });
        }
    });
    return source;
}

export function createWfsLayer(config: WfsDataLayerConfig, context: DataLayerContext): Layer {
    const layer = context.layerFactory.create({
        type: SimpleLayer,
        ...commonOptions(config, context),
        olLayer: new VectorLayer({
            source: createWfsSource(config),
            style: createWfsStyle(wfsLayerColor(config))
        })
    });
    if (config.name == null) {
        fetchWfsCapabilities(config.endpoint)
            .then((capabilities) => {
                const featureType = capabilities.featureTypes.find((type) => type.name === config.wfs.featureType);
                if (featureType) {
                    applyCapabilitiesTitle(layer, config, featureType);
                }
            })
            .catch((error) => LOG.warn(`Failed to load capabilities for the title of '${config.id}'.`, error));
    }
    return layer;
}

/** Number of the next WFS layer the user adds, for its id (session only). */
let nextUserLayer = 1;

/** The configuration of a WFS layer the user adds, from the capabilities of its service. */
export function userWfsLayerConfig(
    endpoint: string,
    capabilities: WfsCapabilities,
    featureType: WfsFeatureType,
    color: string
): WfsDataLayerConfig {
    return {
        id: `user-wfs-${nextUserLayer++}`,
        type: "wfs",
        temporary: true,
        name: featureType.title,
        description: describeLayer(capabilities, featureType),
        endpoint,
        wfs: { featureType: featureType.name, color }
    };
}
