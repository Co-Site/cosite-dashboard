import { createLogger } from "@open-pioneer/core";
import { useIntl } from "open-pioneer:react-hooks";
import { useRef, useState } from "react";
import { CapabilitiesError, normalizeServiceEndpoint } from "../dataLayers/ogcService";
import { fetchWmsCapabilities, WmsCapabilities } from "../dataLayers/wmsCapabilities";

const LOG = createLogger("dashboard:useWmsService");

export type WmsServiceState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "loaded"; endpoint: string; capabilities: WmsCapabilities };

/** The last loaded URL, offered again for the next layer (session only). */
let lastUrl = "";

/**
 * The WMS entered by the user: the URL input and its capabilities, loaded by `load()`.
 * Only the answer to the latest request counts; errors become a localized message.
 */
export function useWmsService() {
    const intl = useIntl();
    const [url, setUrl] = useState(lastUrl);
    const [service, setService] = useState<WmsServiceState>({ kind: "idle" });
    const request = useRef(0);

    const load = () => {
        let endpoint: string;
        try {
            endpoint = normalizeServiceEndpoint(url);
        } catch {
            setService({ kind: "error", message: intl.formatMessage({ id: "addWms.error.invalidUrl" }) });
            return;
        }
        const current = ++request.current;
        lastUrl = url;
        setService({ kind: "loading" });
        fetchWmsCapabilities(endpoint)
            .then((capabilities) => {
                if (current !== request.current) {
                    return;
                }
                if (capabilities.layers.length === 0) {
                    setService({ kind: "error", message: intl.formatMessage({ id: "addWms.error.noLayers" }) });
                    return;
                }
                setService({ kind: "loaded", endpoint, capabilities });
            })
            .catch((e: unknown) => {
                if (current !== request.current) {
                    return;
                }
                LOG.warn(`Failed to load the capabilities of ${endpoint}.`, e);
                const kind = e instanceof CapabilitiesError ? e.kind : "invalid";
                setService({ kind: "error", message: intl.formatMessage({ id: `addWms.error.${kind}` }) });
            });
    };

    return { url, setUrl, service, load };
}
