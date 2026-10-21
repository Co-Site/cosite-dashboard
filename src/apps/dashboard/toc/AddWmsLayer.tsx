import { Box, Button, chakra, Flex, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { createLogger } from "@open-pioneer/core";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { LuPlus, LuX } from "react-icons/lu";
import { userWmsLayerInput } from "../dataLayers/userWmsLayers";
import { probeWmsLayer, WmsCapabilitiesLayer } from "../dataLayers/wmsCapabilities";
import { useUserWmsLayers } from "./useUserWmsLayers";
import { useWmsService } from "./useWmsService";
import { useWmsLayerSearch, WmsLayerList } from "./WmsLayerSearch";

const LOG = createLogger("dashboard:AddWmsLayer");

/** How long the confirmation of an added layer is shown (ms). */
const STATUS_DURATION = 8000;

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
    const map = useMapModelValue();
    const [checking, setChecking] = useState(false);
    const urlInputId = useId();
    const layerInputId = useId();
    const { url, setUrl, service, load } = useWmsService();
    const search = useWmsLayerSearch(service.kind === "loaded" ? service.capabilities.layers : undefined);
    const [error, setError] = useState<string>();
    const layerRef = useRef<HTMLInputElement>(null);

    const loadService = () => {
        setError(undefined);
        search.setActive(0);
        load();
    };

    // Continue with the layer search once the service has been loaded.
    const loaded = service.kind === "loaded";
    useEffect(() => {
        if (loaded) {
            layerRef.current?.focus();
        }
    }, [loaded]);

    const add = async (layer: WmsCapabilitiesLayer | undefined) => {
        if (service.kind !== "loaded" || !layer || checking) {
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
        // Some services list layers that cannot be requested (e.g. folders with a name), check before adding.
        setChecking(true);
        setError(undefined);
        const center = (map.olMap.getView().getCenter() ?? [0, 0]) as [number, number];
        const probe = await probeWmsLayer(service.endpoint, layer.name, center);
        setChecking(false);
        if (!probe.ok) {
            LOG.warn(`Layer '${layer.name}' of ${service.endpoint} cannot be requested: ${probe.message}`);
            setError(intl.formatMessage({ id: "addWms.error.notRequestable" }, { message: probe.message ?? "" }));
            return;
        }
        userLayers.add(userWmsLayerInput(service.endpoint, service.capabilities, layer));
        onAdded(layer.title);
    };

    const onLayerKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            search.move(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            add(search.activeLayer);
        }
    };

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
                                loadService();
                            }
                        }}
                    />
                    <Button size="xs" variant="outline" onClick={loadService} disabled={!url.trim()}>
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

            {service.kind === "loaded" && (
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
                        aria-expanded={search.results.length > 0}
                        aria-controls={search.listId}
                        aria-activedescendant={search.activeLayer ? search.optionId(search.activeIndex) : undefined}
                        placeholder={intl.formatMessage({ id: "addWms.layerPlaceholder" })}
                        value={search.query}
                        onChange={(e) => {
                            search.changeQuery(e.currentTarget.value);
                            setError(undefined);
                        }}
                        onKeyDown={onLayerKeyDown}
                    />
                    {/* Directly below the input: the list can be long. */}
                    {checking && (
                        <Flex gap={2} alignItems="center" fontSize="xs">
                            <Spinner size="xs" />
                            {intl.formatMessage({ id: "addWms.checking" })}
                        </Flex>
                    )}
                    {error && (
                        <Text fontSize="xs" color="fg.error" role="alert">
                            {error}
                        </Text>
                    )}
                    <Text fontSize="xs" color="fg.muted">
                        {search.query.trim() === ""
                            ? intl.formatMessage({ id: "addWms.hint" }, { count: search.results.length })
                            : search.results.length === 0
                              ? intl.formatMessage({ id: "addWms.noResults" })
                              : intl.formatMessage({ id: "addWms.matches" }, { count: search.results.length })}
                    </Text>
                    <WmsLayerList search={search} onPick={add} />
                </Stack>
            )}

            <Flex gap={1} justifyContent="flex-end">
                <Button size="xs" variant="ghost" onClick={onClose}>
                    <LuX />
                    {intl.formatMessage({ id: "addWms.close" })}
                </Button>
                {service.kind === "loaded" && (
                    <Button
                        size="xs"
                        onClick={() => add(search.activeLayer)}
                        disabled={!search.activeLayer || checking}
                    >
                        {intl.formatMessage({ id: "addWms.add" })}
                    </Button>
                )}
            </Flex>
        </Stack>
    );
}
