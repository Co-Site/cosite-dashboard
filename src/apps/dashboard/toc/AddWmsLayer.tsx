import { Box, Button, chakra, Flex, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { createLogger } from "@open-pioneer/core";
import { useIntl } from "open-pioneer:react-hooks";
import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { LuPlus, LuX } from "react-icons/lu";
import { LocalizedText } from "../dataLayers/localizedText";
import { UserWmsLayerInput } from "../dataLayers/userWmsLayers";
import {
    chooseFeatureInfoFormat,
    fetchWmsCapabilities,
    normalizeWmsEndpoint,
    searchLayers,
    WmsCapabilities,
    WmsCapabilitiesError,
    WmsCapabilitiesLayer
} from "../dataLayers/wmsCapabilities";
import { useUserWmsLayers } from "./useUserWmsLayers";

const LOG = createLogger("dashboard:AddWmsLayer");

/** How long the confirmation of an added layer is shown (ms). */
const STATUS_DURATION = 8000;

type ServiceState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "loaded"; endpoint: string; capabilities: WmsCapabilities };

/**
 * Row below the TOC title to add a WMS layer for this session:
 * enter the service URL, then find the layer by name or title.
 */
export function AddWmsLayer() {
    const intl = useIntl();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<string>();
    const urlRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (open) {
            urlRef.current?.focus();
        }
    }, [open]);
    // The confirmation disappears after a while, the layer is visible in the TOC.
    useEffect(() => {
        if (!status) {
            return;
        }
        const timeout = setTimeout(() => setStatus(undefined), STATUS_DURATION);
        return () => clearTimeout(timeout);
    }, [status]);

    return (
        <Box mb={2}>
            <Flex alignItems="center" gap={1}>
                <Button
                    size="xs"
                    variant="ghost"
                    flex="1"
                    justifyContent="flex-start"
                    aria-expanded={open}
                    aria-controls={formId}
                    onClick={() => setOpen(!open)}
                >
                    <LuPlus />
                    {intl.formatMessage({ id: "addWms.toggle" })}
                </Button>
            </Flex>
            {/* Announces added layers, also while the form is closed. */}
            <Text role="status" fontSize="xs" color="fg.muted" px={2}>
                {status}
            </Text>
            {open && (
                <AddWmsForm
                    id={formId}
                    urlRef={urlRef}
                    onAdded={(title) => {
                        setStatus(intl.formatMessage({ id: "addWms.added" }, { title }));
                        setOpen(false);
                    }}
                    onClose={() => setOpen(false)}
                />
            )}
        </Box>
    );
}

function AddWmsForm(props: {
    id: string;
    urlRef: React.RefObject<HTMLInputElement | null>;
    onAdded(title: string): void;
    onClose(): void;
}) {
    const { id, urlRef, onAdded, onClose } = props;
    const intl = useIntl();
    const userLayers = useUserWmsLayers();
    const urlInputId = useId();
    const layerInputId = useId();
    const listId = useId();
    const [url, setUrl] = useState(lastUrl);
    const [service, setService] = useState<ServiceState>({ kind: "idle" });
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [error, setError] = useState<string>();
    const layerRef = useRef<HTMLInputElement>(null);
    const request = useRef(0);

    const load = () => {
        let endpoint: string;
        try {
            endpoint = normalizeWmsEndpoint(url);
        } catch {
            setService({ kind: "error", message: intl.formatMessage({ id: "addWms.error.invalidUrl" }) });
            return;
        }
        const current = ++request.current;
        lastUrl = url;
        setService({ kind: "loading" });
        setError(undefined);
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
                setActive(0);
            })
            .catch((e: unknown) => {
                if (current !== request.current) {
                    return;
                }
                LOG.warn(`Failed to load the capabilities of ${endpoint}.`, e);
                const kind = e instanceof WmsCapabilitiesError ? e.kind : "invalid";
                setService({ kind: "error", message: intl.formatMessage({ id: `addWms.error.${kind}` }) });
            });
    };

    // Continue with the layer search once the service has been loaded.
    const loaded = service.kind === "loaded";
    useEffect(() => {
        if (loaded) {
            layerRef.current?.focus();
        }
    }, [loaded]);

    const search = useMemo(
        () => (service.kind === "loaded" ? searchLayers(service.capabilities.layers, query) : undefined),
        [service, query]
    );
    const results = search ?? [];
    const activeLayer = results[Math.min(active, results.length - 1)];

    const add = (layer: WmsCapabilitiesLayer | undefined) => {
        if (service.kind !== "loaded" || !layer) {
            return;
        }
        if (!layer.supportsMapProjection) {
            setError(intl.formatMessage({ id: "addWms.error.projection" }));
            return;
        }
        if (userLayers.has(service.endpoint, layer.name)) {
            setError(intl.formatMessage({ id: "addWms.error.duplicate" }));
            return;
        }
        userLayers.add(toLayerInput(service.endpoint, service.capabilities, layer));
        onAdded(layer.title);
    };

    const onLayerKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((index) => Math.max(0, Math.min(results.length - 1, index + step)));
        } else if (event.key === "Enter") {
            event.preventDefault();
            add(activeLayer);
        }
    };

    const optionId = (index: number) => `${listId}-${index}`;
    // Keep the active result visible while moving through the list with the arrow keys.
    const listRef = useRef<HTMLUListElement>(null);
    const activeIndex = activeLayer ? results.indexOf(activeLayer) : -1;
    useEffect(() => {
        listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);
    return (
        <Stack id={id} gap={2} borderWidth="1px" borderRadius="md" padding={2} mt={1}>
            <Stack gap={1}>
                <chakra.label htmlFor={urlInputId} fontSize="xs" fontWeight="semibold">
                    {intl.formatMessage({ id: "addWms.url" })}
                </chakra.label>
                <Flex gap={1}>
                    <Input
                        ref={urlRef}
                        id={urlInputId}
                        size="xs"
                        type="url"
                        placeholder="https://…/wms"
                        value={url}
                        onChange={(e) => setUrl(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                load();
                            }
                        }}
                    />
                    <Button size="xs" variant="outline" onClick={load} disabled={!url.trim()}>
                        {intl.formatMessage({ id: "addWms.load" })}
                    </Button>
                </Flex>
                {service.kind === "loading" && (
                    <Flex gap={2} alignItems="center" fontSize="xs">
                        <Spinner size="xs" />
                        {intl.formatMessage({ id: "addWms.loading" })}
                    </Flex>
                )}
                {service.kind === "error" && (
                    <Text fontSize="xs" color="fg.error" role="alert">
                        {service.message}
                    </Text>
                )}
            </Stack>

            {service.kind === "loaded" && search && (
                <Stack gap={1}>
                    <chakra.label htmlFor={layerInputId} fontSize="xs" fontWeight="semibold">
                        {intl.formatMessage({ id: "addWms.layer" })}
                    </chakra.label>
                    <Input
                        ref={layerRef}
                        id={layerInputId}
                        size="xs"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={results.length > 0}
                        aria-controls={listId}
                        aria-activedescendant={activeLayer ? optionId(activeIndex) : undefined}
                        placeholder={intl.formatMessage({ id: "addWms.layerPlaceholder" })}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.currentTarget.value);
                            setActive(0);
                            setError(undefined);
                        }}
                        onKeyDown={onLayerKeyDown}
                    />
                    <Text fontSize="xs" color="fg.muted">
                        {query.trim() === ""
                            ? intl.formatMessage({ id: "addWms.hint" }, { count: results.length })
                            : results.length === 0
                              ? intl.formatMessage({ id: "addWms.noResults" })
                              : intl.formatMessage({ id: "addWms.matches" }, { count: results.length })}
                    </Text>
                    {results.length > 0 && (
                        <Box
                            as="ul"
                            ref={listRef}
                            id={listId}
                            role="listbox"
                            aria-label={intl.formatMessage({ id: "addWms.layer" })}
                            // All layers can be browsed; the TOC panel itself is at most 60vh high.
                            maxHeight="min(22rem, 40vh)"
                            overflowY="auto"
                            borderWidth="1px"
                            borderRadius="sm"
                            listStyleType="none"
                        >
                            {results.map((layer, index) => (
                                <Box
                                    as="li"
                                    key={layer.name}
                                    id={optionId(index)}
                                    role="option"
                                    aria-selected={layer === activeLayer}
                                    paddingX={2}
                                    paddingY={1}
                                    cursor="pointer"
                                    backgroundColor={layer === activeLayer ? "bg.emphasized" : undefined}
                                    _hover={{ backgroundColor: "bg.muted" }}
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => add(layer)}
                                >
                                    <Text fontSize="xs" fontWeight="semibold" lineClamp={2}>
                                        {layer.title}
                                    </Text>
                                    <Text fontSize="2xs" color="fg.muted" truncate>
                                        {[layer.name, ...layer.path].join(" · ")}
                                    </Text>
                                </Box>
                            ))}
                        </Box>
                    )}
                    {error && (
                        <Text fontSize="xs" color="fg.error" role="alert">
                            {error}
                        </Text>
                    )}
                </Stack>
            )}

            <Flex gap={1} justifyContent="flex-end">
                <Button size="xs" variant="ghost" onClick={onClose}>
                    <LuX />
                    {intl.formatMessage({ id: "addWms.close" })}
                </Button>
                {service.kind === "loaded" && (
                    <Button size="xs" onClick={() => add(activeLayer)} disabled={!activeLayer}>
                        {intl.formatMessage({ id: "addWms.add" })}
                    </Button>
                )}
            </Flex>
        </Stack>
    );
}

/** The last loaded URL, offered again for the next layer (session only). */
let lastUrl = "";

/** Labels of the service information in the layer description (both languages, like the configuration). */
const LABELS = {
    provider: { de: "Anbieter", en: "Provider" },
    constraints: { de: "Nutzungsbedingungen", en: "Terms of use" },
    fees: { de: "Gebühren", en: "Fees" }
};

/** Builds the layer configuration from the capabilities. */
function toLayerInput(endpoint: string, capabilities: WmsCapabilities, layer: WmsCapabilitiesLayer): UserWmsLayerInput {
    const format = layer.queryable ? chooseFeatureInfoFormat(capabilities.featureInfoFormats) : undefined;
    return {
        name: layer.title,
        description: describe(capabilities, layer),
        endpoint,
        attribution: layer.attribution,
        wms: {
            layers: [layer.name],
            featureInfo: format ? { format } : { enabled: false }
        }
    };
}

/** Abstract of the layer and information about the service (provider, terms of use, fees). */
function describe(capabilities: WmsCapabilities, layer: WmsCapabilitiesLayer): LocalizedText | undefined {
    const parts = (language: "de" | "en") =>
        [
            layer.abstract !== layer.title ? layer.abstract : undefined,
            capabilities.contactOrganization && `${LABELS.provider[language]}: ${capabilities.contactOrganization}`,
            capabilities.accessConstraints && `${LABELS.constraints[language]}: ${capabilities.accessConstraints}`,
            capabilities.fees && `${LABELS.fees[language]}: ${capabilities.fees}`
        ]
            .filter(Boolean)
            .join("\n\n");
    const de = parts("de");
    return de ? { de, en: parts("en") } : undefined;
}
