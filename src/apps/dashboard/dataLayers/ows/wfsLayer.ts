/*
 * The vector source of a WFS layer: which version, output format and CRS are requested, how the features are read
 * (GeoJSON or GML) and how they are loaded for the visible extent.
 */
import { createLogger } from "@open-pioneer/core";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import GML2 from "ol/format/GML2";
import GML3 from "ol/format/GML3";
import GML32 from "ol/format/GML32";
import WFS from "ol/format/WFS";
import { bbox } from "ol/loadingstrategy";
import { transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { WfsDataLayerConfig, WfsVersion } from "../config/types";
import { exceptionMessage } from "./owsService";
import {
    chooseCrs,
    chooseOutputFormat,
    epsgCode,
    FeatureEncoding,
    fetchWfsCapabilities,
    findFeatureType,
    getFeatureUrl,
    namePrefix,
    outputFormatEncoding,
    WfsCapabilities,
    WfsFeatureType
} from "./wfsCapabilities";

const LOG = createLogger("dashboard:wfsLayer");

/** Maximum number of features per request if the configuration sets none. */
export const DEFAULT_MAX_FEATURES = 1000;

/** Source property: whether the last request returned the maximum number of features (so some may be missing). */
export const TRUNCATED_PROPERTY = "truncated";

/** How the features of a WFS layer are requested and read. */
export interface WfsRequestSettings {
    featureType: WfsFeatureType;
    version: WfsVersion;
    outputFormat: string;
    encoding: FeatureEncoding;

    /** CRS as written in the request (e.g. `urn:ogc:def:crs:EPSG::25832`). */
    srsName: string;

    /** The same CRS as OpenLayers projection code (e.g. `EPSG:25832`). */
    dataProjection: string;
}

/**
 * Settings for the configured feature type: version and output format from the configuration, otherwise from the
 * capabilities; the CRS always from the capabilities. Throws if the service does not offer the feature type or no
 * output format the dashboard can read.
 */
export function resolveWfsRequest(wfs: WfsDataLayerConfig["wfs"], capabilities: WfsCapabilities): WfsRequestSettings {
    const name = wfs.featureType;
    const featureType = findFeatureType(capabilities, name);
    if (!featureType) {
        throw new Error(`The service does not offer the feature type '${name}'.`);
    }
    const outputFormat = wfs.outputFormat ?? chooseOutputFormat(featureType.outputFormats);
    const encoding = outputFormat && outputFormatEncoding(outputFormat);
    if (!outputFormat || !encoding) {
        throw new Error(`No readable output format (GeoJSON or GML) for '${name}': ${outputFormat ?? "none offered"}.`);
    }
    const srsName = chooseCrs(featureType.crs);
    return {
        featureType,
        version: wfs.version ?? capabilities.version,
        outputFormat,
        encoding,
        srsName,
        dataProjection: `EPSG:${epsgCode(srsName)}`
    };
}

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
    const url = getFeatureUrl({
        endpoint: config.endpoint,
        version: settings.version,
        featureType: settings.featureType.name,
        outputFormat: settings.outputFormat,
        srsName: settings.srsName,
        maxFeatures: config.wfs.maxFeatures ?? DEFAULT_MAX_FEATURES,
        extent: transformExtent(extent, mapProjection, settings.dataProjection)
    });
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
            settings ??= fetchWfsCapabilities(config.endpoint).then((capabilities) =>
                resolveWfsRequest(config.wfs, capabilities)
            );
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
