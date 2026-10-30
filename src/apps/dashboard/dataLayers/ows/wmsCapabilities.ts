/*
 * Designed and written by Claude (AI-generated, not reviewed in detail).
 *
 * WMS client helpers: loads and parses GetCapabilities (WMS 1.3.0) and makes the layers available to the TOC,
 * the legend and the feature info. Besides that it checks single layers with a 1 × 1 pixel GetMap request and picks
 * the GetFeatureInfo format. Shared service helpers are in `owsService.ts`.
 */
import WMSCapabilities from "ol/format/WMSCapabilities";
import {
    CapabilitiesError,
    createCapabilitiesCache,
    describeUnexpectedDocument,
    errorMessage,
    exceptionMessage,
    fetchCapabilitiesText,
    LayerProbe,
    meaningful,
    serviceUrl,
    text
} from "./owsService";

export interface WmsCapabilitiesLayer {
    name: string;
    title: string;
    abstract: string | undefined;
    queryable: boolean;
    attribution: string | undefined;

    /** Legend of the layer's first style. */
    legendUrl: string | undefined;

    /** Whether the layer can be requested in the map's projection (EPSG:3857). */
    supportsMapProjection: boolean;

    /** Titles of the parent layers, e.g. `["Fachlayer", "Wetter"]`. */
    path: string[];

    /**
     * Whether the layer has child layers. Such groups should be requestable if they have a name (WMS 1.3.0,
     * 7.2.4.6.3), but some services list folders with a name that cannot be requested (e.g. DWD).
     */
    isGroup: boolean;
}

/** What the dashboard uses from a WMS GetCapabilities document (version 1.3.0). */
export interface WmsCapabilities {
    serviceTitle: string | undefined;
    contactOrganization: string | undefined;
    fees: string | undefined;
    accessConstraints: string | undefined;

    /** Formats offered for GetFeatureInfo, e.g. `application/json`. */
    featureInfoFormats: string[];

    /** All layers that can be requested (i.e. have a name), in document order. */
    layers: WmsCapabilitiesLayer[];
}

const MAP_PROJECTION = "EPSG:3857";

interface RawLayer {
    Name?: string;
    Title?: string;
    Abstract?: string;
    queryable?: boolean;
    CRS?: string[];
    Attribution?: { Title?: string };
    Style?: { LegendURL?: { OnlineResource?: string }[] }[];
    Layer?: RawLayer[];
}

/** Subset of the object returned by `ol/format/WMSCapabilities`. */
interface RawCapabilities {
    Service?: {
        Title?: string;
        Fees?: string;
        AccessConstraints?: string;
        ContactInformation?: { ContactPersonPrimary?: { ContactOrganization?: string } };
    };
    Capability?: {
        Request?: { GetFeatureInfo?: { Format?: string[] } };
        Layer?: RawLayer;
    };
}

function collectLayers(
    layer: RawLayer | undefined,
    path: string[],
    result: WmsCapabilitiesLayer[],
    inheritedCrs: string[] = []
): void {
    if (!layer) {
        return;
    }
    // CRS are inherited from all ancestors (WMS 1.3.0, 7.2.4.8). OpenLayers only inherits them reliably across one
    // level, a layer below a group without own CRS would lose the CRS of the root layer.
    const crs = [...(layer.CRS ?? []), ...inheritedCrs];
    const title = text(layer.Title);
    if (layer.Name) {
        result.push({
            name: layer.Name,
            title: title ?? layer.Name,
            abstract: text(layer.Abstract),
            queryable: !!layer.queryable,
            attribution: text(layer.Attribution?.Title),
            legendUrl: layer.Style?.[0]?.LegendURL?.[0]?.OnlineResource,
            supportsMapProjection: crs.includes(MAP_PROJECTION),
            path,
            isGroup: (layer.Layer ?? []).length > 0
        });
    }
    const childPath = title ? [...path, title] : path;
    for (const child of layer.Layer ?? []) {
        collectLayers(child, childPath, result, crs);
    }
}

/**
 * Parses a WMS 1.3.0 capabilities document.
 * Throws a {@link CapabilitiesError} for exception reports and other documents.
 */
export function parseWmsCapabilities(xml: string): WmsCapabilities {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const root = document.documentElement;
    if (root?.localName !== "WMS_Capabilities") {
        const content = describeUnexpectedDocument(root);
        throw new CapabilitiesError(
            "invalid",
            `Not a WMS 1.3.0 capabilities document${content ? `: ${content}` : "."}`
        );
    }

    const parsed = new WMSCapabilities().read(document) as RawCapabilities;
    const service = parsed.Service ?? {};
    const layers: WmsCapabilitiesLayer[] = [];
    collectLayers(parsed.Capability?.Layer, [], layers);
    return {
        serviceTitle: text(service.Title),
        contactOrganization: text(service.ContactInformation?.ContactPersonPrimary?.ContactOrganization),
        fees: meaningful(service.Fees),
        accessConstraints: meaningful(service.AccessConstraints),
        featureInfoFormats: parsed.Capability?.Request?.GetFeatureInfo?.Format ?? [],
        layers
    };
}

async function loadCapabilities(endpoint: string): Promise<WmsCapabilities> {
    return parseWmsCapabilities(await fetchCapabilitiesText(endpoint, { SERVICE: "WMS", VERSION: "1.3.0" }));
}

const capabilitiesCache = createCapabilitiesCache(loadCapabilities);

/**
 * Loads and parses the capabilities of a WMS (once per endpoint and session, failures are not cached).
 * Unlike `@open-pioneer/map`, no `LANGUAGE` parameter is sent and existing URL parameters are kept.
 */
export function fetchWmsCapabilities(endpoint: string): Promise<WmsCapabilities> {
    return capabilitiesCache.fetch(endpoint);
}

/** Returns the capabilities if they have already been loaded (no request). */
export function peekWmsCapabilities(endpoint: string): WmsCapabilities | undefined {
    return capabilitiesCache.peek(endpoint);
}

/**
 * Requests a tiny map image (1 × 1 pixel around `center`, EPSG:3857) to find out whether the service can deliver the
 * layer. Services answer errors with HTTP 200 and an XML exception, so only an image counts as success.
 */
export async function probeWmsLayer(
    endpoint: string,
    layerName: string,
    center: [number, number]
): Promise<LayerProbe> {
    const [x, y] = center;
    const url = serviceUrl(endpoint, {
        SERVICE: "WMS",
        VERSION: "1.3.0",
        REQUEST: "GetMap",
        LAYERS: layerName,
        STYLES: "",
        CRS: MAP_PROJECTION,
        BBOX: [x - 50, y - 50, x + 50, y + 50].join(","),
        WIDTH: "1",
        HEIGHT: "1",
        FORMAT: "image/png",
        TRANSPARENT: "TRUE"
    });
    try {
        const response = await fetch(url);
        const contentType = response.headers.get("content-type") ?? "";
        if (response.ok && contentType.startsWith("image/")) {
            return { ok: true };
        }
        return { ok: false, message: exceptionMessage(await response.text()) ?? `HTTP ${response.status}` };
    } catch (error) {
        return { ok: false, message: errorMessage(error) };
    }
}

/** GetFeatureInfo formats the dashboard can read, in order of preference. */
const FEATURE_INFO_FORMATS = ["application/json", "application/geo+json"];

/** Picks a GetFeatureInfo format the dashboard can read (GeoJSON), or `undefined` if the service offers none. */
export function chooseFeatureInfoFormat(formats: string[]): string | undefined {
    const offered = formats.map((format) => format.toLowerCase());
    return FEATURE_INFO_FORMATS.find((format) => offered.includes(format));
}
