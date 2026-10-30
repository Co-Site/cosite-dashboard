/*
 * Helpers shared by the OGC service clients (WMS, WFS): normalizing service URLs entered by the user,
 * loading capabilities documents with a session cache, reading error messages of the services, and describing a
 * layer added by the user with the information about its service.
 */
import { LocalizedText } from "../config/localizedText";

/** The service could not be reached (network error, wrong host or no CORS); other failures are plain errors. */
export class ServiceUnreachableError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "ServiceUnreachableError";
    }
}

/** The trimmed text, or `undefined` if it is empty. */
export function text(value: string | undefined | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/** `none` is a common value for fees and access constraints, it carries no information. */
export function meaningful(value: string | undefined | null): string | undefined {
    const trimmed = text(value);
    return trimmed && trimmed.toLowerCase() !== "none" ? trimmed : undefined;
}

/** Message of a failed request for the user (network errors have no HTTP status). */
export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** Parameters of a GetCapabilities or GetFeature request; removed from user input to get the service endpoint. */
const REQUEST_PARAMS = ["service", "request", "version", "language", "typename", "typenames"];

/**
 * Returns the service endpoint for a URL entered by the user:
 * whitespace trimmed and request parameters of a pasted request URL removed.
 * Other parameters (e.g. `map=…` of MapServer) are kept.
 * Throws for URLs that are not http(s).
 */
export function normalizeServiceEndpoint(input: string): string {
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

/** The endpoint with the given request parameters set (existing parameters are kept). */
export function serviceUrl(endpoint: string, params: Record<string, string>): URL {
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url;
}

/**
 * Loads a GetCapabilities document as text.
 * Throws a {@link ServiceUnreachableError} for network errors and an `Error` for HTTP errors.
 */
export async function fetchCapabilitiesText(endpoint: string, params: Record<string, string>): Promise<string> {
    let response: Response;
    try {
        response = await fetch(serviceUrl(endpoint, { ...params, REQUEST: "GetCapabilities" }));
    } catch (error) {
        throw new ServiceUnreachableError(`Failed to load capabilities from ${endpoint}.`, { cause: error });
    }
    if (!response.ok) {
        throw new Error(`Failed to load capabilities from ${endpoint}: HTTP ${response.status}`);
    }
    return response.text();
}

/**
 * Parses a capabilities document and returns its root element. Throws if the root is not `rootName`, e.g. for an
 * exception report; the message contains the start of the document's text.
 */
export function parseCapabilitiesRoot(xml: string, rootName: string): Element {
    const root = new DOMParser().parseFromString(xml, "application/xml").documentElement;
    if (root?.localName !== rootName) {
        const content = root?.textContent?.trim().replace(/\s+/g, " ").slice(0, 300);
        throw new Error(`Not a ${rootName} document${content ? `: ${content}` : "."}`);
    }
    return root;
}

/** Message of a WMS service exception or an OWS exception report, if the text contains one. */
export function exceptionMessage(text: string): string | undefined {
    return /<(?:\w+:)?(?:ServiceException|ExceptionText)(?=[\s>])[^>]*>([^<]*)</.exec(text)?.[1]?.trim() || undefined;
}

/**
 * Loads capabilities once per endpoint and session; failures are not cached, so a later attempt loads again.
 * `peek` returns capabilities that have already been loaded (no request).
 */
export function createCapabilitiesCache<T>(load: (endpoint: string) => Promise<T>) {
    const pending = new Map<string, Promise<T>>();
    const loaded = new Map<string, T>();
    return {
        fetch(endpoint: string): Promise<T> {
            let capabilities = pending.get(endpoint);
            if (!capabilities) {
                capabilities = load(endpoint);
                pending.set(endpoint, capabilities);
                capabilities.then(
                    (result) => loaded.set(endpoint, result),
                    () => pending.delete(endpoint)
                );
            }
            return capabilities;
        },
        peek(endpoint: string): T | undefined {
            return loaded.get(endpoint);
        }
    };
}

/** What a description of a user layer is made of: the layer's abstract and information about its service. */
export interface ServiceDescription {
    contactOrganization: string | undefined;
    fees: string | undefined;
    accessConstraints: string | undefined;
}

/** Labels of the service information in the layer description (both languages, like the configuration). */
const LABELS = {
    provider: { de: "Anbieter", en: "Provider" },
    constraints: { de: "Nutzungsbedingungen", en: "Terms of use" },
    fees: { de: "Gebühren", en: "Fees" }
};

/** Abstract of the layer and information about the service (provider, terms of use, fees). */
export function describeLayer(
    service: ServiceDescription,
    layer: { title: string; abstract: string | undefined }
): LocalizedText | undefined {
    const parts = (language: "de" | "en") =>
        [
            layer.abstract !== layer.title ? layer.abstract : undefined,
            service.contactOrganization && `${LABELS.provider[language]}: ${service.contactOrganization}`,
            service.accessConstraints && `${LABELS.constraints[language]}: ${service.accessConstraints}`,
            service.fees && `${LABELS.fees[language]}: ${service.fees}`
        ]
            .filter(Boolean)
            .join("\n\n");
    const de = parts("de");
    return de ? { de, en: parts("en") } : undefined;
}
