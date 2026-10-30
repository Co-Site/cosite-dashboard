import { WFS_VERSIONS, WfsDataLayerConfig, WfsVersion } from "../config/types";
/*
 * WFS client helpers: loads and parses GetCapabilities (WFS 2.0.0 and 1.1.0), picks output format and coordinate
 * reference system of a feature type, builds GetFeature requests and checks single feature types before they are
 * added. Shared service helpers are in `owsService.ts`.
 */
import {
    createCapabilitiesCache,
    errorMessage,
    exceptionMessage,
    fetchCapabilitiesText,
    meaningful,
    parseCapabilitiesRoot,
    serviceUrl,
    text
} from "./owsService";

export interface WfsFeatureType {
    /** Qualified name, e.g. `app:landesgrenze`. */
    name: string;
    title: string;
    abstract: string | undefined;

    /** Namespace URI of the name's prefix (needed to read GML), if declared. */
    namespace: string | undefined;

    /** Coordinate reference systems as written by the service, the default one first. */
    crs: string[];

    /** GetFeature output formats for this type (the service-wide list if the type has none). */
    outputFormats: string[];
}

/** What the dashboard uses from a WFS GetCapabilities document. */
export interface WfsCapabilities {
    version: WfsVersion;
    serviceTitle: string | undefined;
    contactOrganization: string | undefined;
    fees: string | undefined;
    accessConstraints: string | undefined;
    featureTypes: WfsFeatureType[];
}

/** How the features of an output format are encoded; decides how they are read. */
export type FeatureEncoding = "geojson" | "gml32" | "gml3" | "gml2";

/** Encodings in order of preference. */
const ENCODINGS: FeatureEncoding[] = ["geojson", "gml32", "gml3", "gml2"];

/** Projected systems the map can use directly, in order of preference (no axis order ambiguity, unlike lat/lon). */
const PREFERRED_CRS = [3857, 25832, 25833];

/** Requested if a feature type lists none of {@link PREFERRED_CRS}; many services reproject anyway. */
const FALLBACK_CRS = "EPSG:3857";

function children(element: Element, localName: string): Element[] {
    return [...element.children].filter((child) => child.localName === localName);
}

function child(element: Element, localName: string): Element | undefined {
    return children(element, localName)[0];
}

function childText(element: Element | undefined, localName: string): string | undefined {
    return element ? text(child(element, localName)?.textContent) : undefined;
}

/** URI of a namespace prefix declared on the element or one of its ancestors. */
function namespaceOf(element: Element, prefix: string): string | undefined {
    for (let current: Element | null = element; current; current = current.parentElement) {
        const uri = current.getAttribute(`xmlns:${prefix}`);
        if (uri) {
            return uri;
        }
    }
    return undefined;
}

/** Values of `ows:Parameter[name=…]/ows:AllowedValues/ows:Value` (WFS 2.0) or `ows:Value` (WFS 1.1) below `element`. */
function parameterValues(element: Element | undefined, name: string): string[] {
    const parameter = element && children(element, "Parameter").find((p) => p.getAttribute("name") === name);
    if (!parameter) {
        return [];
    }
    return [...parameter.getElementsByTagName("*")]
        .filter((descendant) => descendant.localName === "Value")
        .map((value) => text(value.textContent))
        .filter((value): value is string => !!value);
}

/** Output formats offered for GetFeature: by the operation or, in WFS 2.0, for all operations. */
function serviceOutputFormats(root: Element): string[] {
    const metadata = child(root, "OperationsMetadata");
    const getFeature = metadata && children(metadata, "Operation").find((o) => o.getAttribute("name") === "GetFeature");
    const formats = parameterValues(getFeature, "outputFormat");
    return formats.length ? formats : parameterValues(metadata, "outputFormat");
}

/** Namespace prefix of a qualified name (`app` of `app:landesgrenze`), if it has one. */
export function namePrefix(name: string): string | undefined {
    const separator = name.indexOf(":");
    return separator > 0 ? name.slice(0, separator) : undefined;
}

function parseFeatureType(element: Element, serviceFormats: string[]): WfsFeatureType | undefined {
    const nameElement = child(element, "Name");
    const name = text(nameElement?.textContent);
    if (!nameElement || !name) {
        return undefined;
    }
    const prefix = namePrefix(name);
    const typeFormats = [...(child(element, "OutputFormats")?.children ?? [])]
        .map((format) => text(format.textContent))
        .filter((format): format is string => !!format);
    const crs = ["DefaultCRS", "DefaultSRS", "OtherCRS", "OtherSRS"]
        .flatMap((localName) => children(element, localName))
        .map((crsElement) => text(crsElement.textContent))
        .filter((value): value is string => !!value);
    return {
        name,
        title: childText(element, "Title") ?? name,
        abstract: childText(element, "Abstract"),
        // Without a prefix the name has no namespace of its own (the default namespace is the one of WFS).
        namespace: prefix ? namespaceOf(nameElement, prefix) : undefined,
        crs,
        outputFormats: typeFormats.length ? typeFormats : serviceFormats
    };
}

/**
 * Parses a WFS 2.0.0 or 1.1.0 capabilities document. Elements are matched by local name, so namespace prefixes do
 * not matter. Throws for exception reports, other documents and other versions.
 */
export function parseWfsCapabilities(xml: string): WfsCapabilities {
    const root = parseCapabilitiesRoot(xml, "WFS_Capabilities");
    const version = WFS_VERSIONS.find((supported) => supported === root.getAttribute("version"));
    if (!version) {
        throw new Error(`Unsupported WFS version '${root.getAttribute("version")}'.`);
    }

    const identification = child(root, "ServiceIdentification");
    const serviceFormats = serviceOutputFormats(root);
    const featureTypeList = child(root, "FeatureTypeList");
    return {
        version,
        serviceTitle: childText(identification, "Title"),
        contactOrganization: childText(child(root, "ServiceProvider"), "ProviderName"),
        fees: meaningful(childText(identification, "Fees")),
        accessConstraints: meaningful(childText(identification, "AccessConstraints")),
        featureTypes: (featureTypeList ? children(featureTypeList, "FeatureType") : [])
            .map((element) => parseFeatureType(element, serviceFormats))
            .filter((type): type is WfsFeatureType => !!type)
    };
}

/** Asks for all supported versions at once; the service answers with the newest one it supports. */
async function loadCapabilities(endpoint: string): Promise<WfsCapabilities> {
    const xml = await fetchCapabilitiesText(endpoint, { SERVICE: "WFS", ACCEPTVERSIONS: WFS_VERSIONS.join(",") });
    return parseWfsCapabilities(xml);
}

const capabilitiesCache = createCapabilitiesCache(loadCapabilities);

/** Loads and parses the capabilities of a WFS (once per endpoint and session, failures are not cached). */
export function fetchWfsCapabilities(endpoint: string): Promise<WfsCapabilities> {
    return capabilitiesCache.fetch(endpoint);
}

/** How the features of an output format are encoded, or `undefined` if the dashboard cannot read them. */
export function outputFormatEncoding(format: string): FeatureEncoding | undefined {
    const value = format.toLowerCase();
    if (value.includes("json")) {
        // JSON-FG and other JSON dialects are not plain GeoJSON.
        return /fg\+json|jsonfg/.test(value) ? undefined : "geojson";
    }
    if (!value.includes("gml")) {
        return undefined;
    }
    if (/3\.2|gml32/.test(value)) {
        return "gml32";
    }
    if (/3\.1|gml3/.test(value)) {
        return "gml3";
    }
    return /2\.1|gml2/.test(value) ? "gml2" : undefined;
}

/** Picks the output format the dashboard reads best (GeoJSON before GML), or `undefined` if it can read none. */
export function chooseOutputFormat(formats: string[]): string | undefined {
    for (const encoding of ENCODINGS) {
        const format = formats.find((candidate) => outputFormatEncoding(candidate) === encoding);
        if (format) {
            return format;
        }
    }
    return undefined;
}

/**
 * EPSG code of a CRS identifier such as `EPSG:3857`, `urn:ogc:def:crs:EPSG::3857`, `urn:x-ogc:def:crs:EPSG:6.18:3857`,
 * `http://www.opengis.net/def/crs/EPSG/0/3857` or `http://www.opengis.net/gml/srs/epsg.xml#3857`.
 */
export function epsgCode(crs: string): number | undefined {
    const match = /EPSG(?:::|:[\d.]*:|:|\/0\/|\.xml#)(\d+)$/i.exec(crs.trim());
    return match ? Number(match[1]) : undefined;
}

/**
 * Picks the CRS to request: the first of {@link PREFERRED_CRS} the feature type lists (written as the service does),
 * otherwise {@link FALLBACK_CRS}. Projected systems avoid the lat/lon axis order differences between services.
 */
export function chooseCrs(crs: string[]): string {
    for (const code of PREFERRED_CRS) {
        const listed = crs.find((candidate) => epsgCode(candidate) === code);
        if (listed) {
            return listed;
        }
    }
    return FALLBACK_CRS;
}

/** How the features of a feature type are requested and read. */
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
 * Settings for a feature type: version and output format from the configuration, otherwise from the capabilities;
 * the CRS always from the capabilities. `undefined` if the service does not offer the feature type or no output format
 * the dashboard can read.
 */
export function resolveWfsRequest(
    wfs: Pick<WfsDataLayerConfig["wfs"], "featureType" | "version" | "outputFormat">,
    capabilities: WfsCapabilities
): WfsRequestSettings | undefined {
    const featureType = capabilities.featureTypes.find((type) => type.name === wfs.featureType);
    const outputFormat = wfs.outputFormat ?? (featureType && chooseOutputFormat(featureType.outputFormats));
    const encoding = outputFormat && outputFormatEncoding(outputFormat);
    if (!featureType || !outputFormat || !encoding) {
        return undefined;
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

/**
 * The GetFeature URL (KVP encoding) for at most `maxFeatures` features, within `extent` (in the request's CRS) if
 * given. WFS 2.0 and 1.1 name the type and the limit differently.
 */
export function getFeatureUrl(
    endpoint: string,
    settings: WfsRequestSettings,
    maxFeatures: number,
    extent?: number[]
): URL {
    const { version, featureType, outputFormat, srsName } = settings;
    const is2 = version === "2.0.0";
    const params: Record<string, string> = {
        SERVICE: "WFS",
        VERSION: version,
        REQUEST: "GetFeature",
        [is2 ? "TYPENAMES" : "TYPENAME"]: featureType.name,
        OUTPUTFORMAT: outputFormat,
        SRSNAME: srsName,
        [is2 ? "COUNT" : "MAXFEATURES"]: String(maxFeatures)
    };
    if (extent) {
        // Projected CRS only (see `chooseCrs`): east/north order, the CRS is named to rule out the default.
        params.BBOX = [...extent, srsName].join(",");
    }
    return serviceUrl(endpoint, params);
}

/** Whether the response looks like a feature collection in the requested encoding. */
function isFeatureCollection(body: string, encoding: FeatureEncoding): boolean {
    if (encoding === "geojson") {
        try {
            const json: unknown = JSON.parse(body);
            return (
                typeof json === "object" && json !== null && (json as { type?: unknown }).type === "FeatureCollection"
            );
        } catch {
            return false;
        }
    }
    const root = new DOMParser().parseFromString(body, "application/xml").documentElement;
    return root?.localName === "FeatureCollection";
}

/**
 * Requests a single feature to find out whether the service can deliver the feature type in the chosen format and
 * CRS. Services answer errors with HTTP 200 and an exception report, so only a feature collection counts as success.
 * Resolves to the service's error message, or `undefined` if the feature type can be delivered.
 */
export async function probeWfsFeatureType(endpoint: string, settings: WfsRequestSettings): Promise<string | undefined> {
    try {
        const response = await fetch(getFeatureUrl(endpoint, settings, 1));
        const body = await response.text();
        if (response.ok && isFeatureCollection(body, settings.encoding)) {
            return undefined;
        }
        return exceptionMessage(body) ?? `HTTP ${response.status}`;
    } catch (error) {
        return errorMessage(error);
    }
}
