import WMSCapabilities from "ol/format/WMSCapabilities";

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
}

/** Why the capabilities could not be loaded. */
export type WmsCapabilitiesErrorKind =
    /** Network error, e.g. wrong host or CORS. */
    | "unreachable"
    /** The response is not a WMS capabilities document (or the server reports an exception). */
    | "invalid";

export class WmsCapabilitiesError extends Error {
    constructor(
        readonly kind: WmsCapabilitiesErrorKind,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = "WmsCapabilitiesError";
    }
}

const MAP_PROJECTION = "EPSG:3857";

/** Parameters of a GetCapabilities request; removed from user input to get the service endpoint. */
const REQUEST_PARAMS = ["service", "request", "version", "language"];

/**
 * Returns the service endpoint for a URL entered by the user:
 * whitespace trimmed and request parameters of a pasted GetCapabilities URL removed.
 * Other parameters (e.g. `map=…` of MapServer) are kept.
 * Throws for URLs that are not http(s).
 */
export function normalizeWmsEndpoint(input: string): string {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new TypeError(`Unsupported protocol '${url.protocol}'.`);
    }
    for (const key of [...url.searchParams.keys()]) {
        if (REQUEST_PARAMS.includes(key.toLowerCase())) {
            url.searchParams.delete(key);
        }
    }
    return url.href.replace(/\?$/, "");
}

const cache = new Map<string, Promise<WmsCapabilities>>();
const loaded = new Map<string, WmsCapabilities>();

/**
 * Loads and parses the capabilities of a WMS (once per endpoint and session, failures are not cached).
 * Unlike `@open-pioneer/map`, no `LANGUAGE` parameter is sent and existing URL parameters are kept.
 */
export function fetchWmsCapabilities(endpoint: string): Promise<WmsCapabilities> {
    let capabilities = cache.get(endpoint);
    if (!capabilities) {
        capabilities = loadCapabilities(endpoint);
        cache.set(endpoint, capabilities);
        capabilities.then(
            (result) => loaded.set(endpoint, result),
            () => cache.delete(endpoint)
        );
    }
    return capabilities;
}

/** Returns the capabilities if they have already been loaded (no request). */
export function peekWmsCapabilities(endpoint: string): WmsCapabilities | undefined {
    return loaded.get(endpoint);
}

async function loadCapabilities(endpoint: string): Promise<WmsCapabilities> {
    const url = new URL(endpoint);
    url.searchParams.set("SERVICE", "WMS");
    url.searchParams.set("REQUEST", "GetCapabilities");
    url.searchParams.set("VERSION", "1.3.0");
    let response: Response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new WmsCapabilitiesError("unreachable", `Failed to load capabilities from ${endpoint}.`, {
            cause: error
        });
    }
    if (!response.ok) {
        throw new WmsCapabilitiesError(
            "invalid",
            `Failed to load capabilities from ${endpoint}: HTTP ${response.status}`
        );
    }
    return parseWmsCapabilities(await response.text());
}

/**
 * Parses a WMS 1.3.0 capabilities document.
 * Throws a {@link WmsCapabilitiesError} for exception reports and other documents.
 */
export function parseWmsCapabilities(xml: string): WmsCapabilities {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const root = document.documentElement;
    if (root?.localName !== "WMS_Capabilities") {
        const exception = root?.textContent?.trim().replace(/\s+/g, " ");
        throw new WmsCapabilitiesError(
            "invalid",
            `Not a WMS 1.3.0 capabilities document${exception ? `: ${exception.slice(0, 300)}` : "."}`
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
            path
        });
    }
    const childPath = title ? [...path, title] : path;
    for (const child of layer.Layer ?? []) {
        collectLayers(child, childPath, result, crs);
    }
}

function text(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/** `none` is a common value for fees and access constraints, it carries no information. */
function meaningful(value: string | undefined): string | undefined {
    const trimmed = text(value);
    return trimmed && trimmed.toLowerCase() !== "none" ? trimmed : undefined;
}

/** GetFeatureInfo formats the dashboard can read, in order of preference. */
const FEATURE_INFO_FORMATS = ["application/json", "application/geo+json"];

/** Picks a GetFeatureInfo format the dashboard can read (GeoJSON), or `undefined` if the service offers none. */
export function chooseFeatureInfoFormat(formats: string[]): string | undefined {
    const offered = formats.map((format) => format.toLowerCase());
    return FEATURE_INFO_FORMATS.find((format) => offered.includes(format));
}

/**
 * Filters layers by name or title (case-insensitive); without a query all layers are returned, in document order.
 * An exact name comes first, then title matches, then name matches.
 */
export function searchLayers(layers: WmsCapabilitiesLayer[], query: string): WmsCapabilitiesLayer[] {
    const term = query.trim().toLowerCase();
    if (!term) {
        return layers;
    }
    const rank = (layer: WmsCapabilitiesLayer) => {
        if (layer.name.toLowerCase() === term) {
            return 0;
        }
        if (layer.title.toLowerCase().includes(term)) {
            return 1;
        }
        return layer.name.toLowerCase().includes(term) ? 2 : undefined;
    };
    return layers
        .map((layer, index) => ({ layer, index, rank: rank(layer) }))
        .filter(
            (match): match is { layer: WmsCapabilitiesLayer; index: number; rank: number } => match.rank !== undefined
        )
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((match) => match.layer);
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
