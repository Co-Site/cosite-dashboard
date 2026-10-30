import { createLogger } from "@open-pioneer/core";
import { useIntl } from "open-pioneer:react-hooks";
import { useRef, useState } from "react";
import { normalizeServiceEndpoint, ServiceUnreachableError } from "../dataLayers/ows/owsService";
import { UserLayerKind } from "../dataLayers/userLayers";
import { SearchOption } from "./LayerSearch";
import { UserService } from "./userServices";

const LOG = createLogger("dashboard:useServiceCapabilities");

type ServiceState<Capabilities> =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "loaded"; endpoint: string; capabilities: Capabilities };

/** The last loaded URL per kind of service, offered again for the next layer (session only). */
const lastUrls = new Map<UserLayerKind, string>();

/**
 * The service entered by the user: the URL input and its capabilities, loaded by `load()`.
 * Only the answer to the latest request counts; errors become a localized message.
 */
export function useServiceCapabilities<Capabilities, Entry extends SearchOption>(
    service: UserService<Capabilities, Entry>
) {
    const intl = useIntl();
    const [url, setUrl] = useState(() => lastUrls.get(service.kind) ?? "");
    const [state, setState] = useState<ServiceState<Capabilities>>({ kind: "idle" });
    const request = useRef(0);

    const fail = (messageId: string) => setState({ kind: "error", message: intl.formatMessage({ id: messageId }) });

    const load = () => {
        let endpoint: string;
        try {
            endpoint = normalizeServiceEndpoint(url);
        } catch {
            fail("addService.error.invalidUrl");
            return;
        }
        const current = ++request.current;
        lastUrls.set(service.kind, url);
        setState({ kind: "loading" });
        service
            .fetchCapabilities(endpoint)
            .then((capabilities) => {
                if (current !== request.current) {
                    return;
                }
                if (service.entries(capabilities).length === 0) {
                    fail(`${service.messages}.error.noLayers`);
                    return;
                }
                setState({ kind: "loaded", endpoint, capabilities });
            })
            .catch((e: unknown) => {
                if (current !== request.current) {
                    return;
                }
                LOG.warn(`Failed to load the capabilities of ${endpoint}.`, e);
                fail(
                    e instanceof ServiceUnreachableError
                        ? "addService.error.unreachable"
                        : `${service.messages}.error.invalid`
                );
            });
    };

    return { url, setUrl, state, load };
}
