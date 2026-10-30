/*
 * Helpers shared by the OGC service clients (WMS, WFS): normalizing service URLs entered by the user,
 * loading capabilities documents with a session cache, and reading error messages of the services.
 */

/** Why the capabilities could not be loaded. */
export type CapabilitiesErrorKind =
    /** Network error, e.g. wrong host or CORS. */
    | "unreachable"
    /** The response is not a capabilities document of the service type (or the server reports an exception). */
    | "invalid";

export class CapabilitiesError extends Error {
    constructor(
        readonly kind: CapabilitiesErrorKind,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = "CapabilitiesError";
    }
}

/** Result of checking whether a service can deliver a layer before it is added. */
export interface LayerProbe {
    ok: boolean;

    /** Error message of the service (e.g. from an exception report), if any. */
    message?: string;
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
 * Throws a {@link CapabilitiesError} for network errors and HTTP errors.
 */
export async function fetchCapabilitiesText(endpoint: string, params: Record<string, string>): Promise<string> {
    let response: Response;
    try {
        response = await fetch(serviceUrl(endpoint, { ...params, REQUEST: "GetCapabilities" }));
    } catch (error) {
        throw new CapabilitiesError("unreachable", `Failed to load capabilities from ${endpoint}.`, { cause: error });
    }
    if (!response.ok) {
        throw new CapabilitiesError("invalid", `Failed to load capabilities from ${endpoint}: HTTP ${response.status}`);
    }
    return response.text();
}

/** Text of the root element of a document that is not the expected one (e.g. an exception report), shortened. */
export function describeUnexpectedDocument(root: Element | null): string | undefined {
    const content = root?.textContent?.trim().replace(/\s+/g, " ");
    return content ? content.slice(0, 300) : undefined;
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
