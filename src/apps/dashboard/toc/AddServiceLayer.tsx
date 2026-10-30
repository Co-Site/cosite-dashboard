import { Box, Button, chakra, Flex, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { ChangeEvent, KeyboardEvent, RefObject, useEffect, useId, useRef, useState } from "react";
import { LuPlus, LuX } from "react-icons/lu";
import { LayerList, SearchOption, useLayerSearch } from "./LayerSearch";
import { UserService } from "./userServices";
import { useServiceCapabilities } from "./useServiceCapabilities";
import { useUserLayers } from "./useUserLayers";

/** How long the confirmation of an added layer is shown (ms). */
const STATUS_DURATION = 8000;

interface AddServiceFormProps<Capabilities, Entry extends SearchOption> {
    id: string;
    service: UserService<Capabilities, Entry>;
    urlRef: RefObject<HTMLInputElement | null>;
    onAdded(title: string): void;
    onClose(): void;
}

function AddServiceForm<Capabilities, Entry extends SearchOption>(props: AddServiceFormProps<Capabilities, Entry>) {
    const { id, service, urlRef, onAdded, onClose } = props;
    const intl = useIntl();
    const userLayers = useUserLayers(service.kind);
    const map = useMapModelValue();
    const [checking, setChecking] = useState(false);
    const urlInputId = useId();
    const layerInputId = useId();
    const { url, setUrl, state, load } = useServiceCapabilities(service);
    const search = useLayerSearch(state.kind === "loaded" ? service.entries(state.capabilities) : undefined);
    const [error, setError] = useState<string>();
    const layerRef = useRef<HTMLInputElement>(null);

    // Shared texts are below `addService`, the others below the prefix of the service kind.
    const shared = (key: string, values?: Record<string, string | number>) =>
        intl.formatMessage({ id: `addService.${key}` }, values);
    const specific = (key: string, values?: Record<string, string | number>) =>
        intl.formatMessage({ id: `${service.messages}.${key}` }, values);

    const loadService = () => {
        setError(undefined);
        search.setActive(0);
        load();
    };

    // Continue with the layer search once the service has been loaded.
    const loaded = state.kind === "loaded";
    useEffect(() => {
        if (loaded) {
            layerRef.current?.focus();
        }
    }, [loaded]);

    const add = async (entry: Entry | undefined) => {
        if (state.kind !== "loaded" || !entry || checking) {
            return;
        }
        if (userLayers.has(state.endpoint, entry.name)) {
            setError(shared("error.duplicate"));
            return;
        }
        setChecking(true);
        setError(undefined);
        const failure = await service.check(state.endpoint, state.capabilities, entry, map);
        setChecking(false);
        if (failure) {
            setError(specific(failure.messageId, { message: failure.message ?? "" }));
            return;
        }
        userLayers.add(service.input(state.endpoint, state.capabilities, entry));
        onAdded(entry.title);
    };

    const onLayerKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            search.move(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            add(search.activeOption);
        }
    };

    const addActiveLayer = () => add(search.activeOption);
    const changeUrl = (event: ChangeEvent<HTMLInputElement>) => setUrl(event.currentTarget.value);
    const onUrlKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
            event.preventDefault();
            loadService();
        }
    };
    const changeLayerQuery = (event: ChangeEvent<HTMLInputElement>) => {
        search.changeQuery(event.currentTarget.value);
        setError(undefined);
    };

    return (
        <Stack id={id} gap={2} borderWidth="1px" borderRadius="md" padding={2} mt={1}>
            <Stack gap={1}>
                <chakra.label htmlFor={urlInputId} fontSize="xs" fontWeight="semibold">
                    {shared("url")}
                </chakra.label>
                <Flex gap={1}>
                    <Input
                        ref={urlRef}
                        id={urlInputId}
                        size="xs"
                        type="url"
                        placeholder={specific("urlPlaceholder")}
                        value={url}
                        onChange={changeUrl}
                        onKeyDown={onUrlKeyDown}
                    />
                    <Button size="xs" variant="outline" onClick={loadService} disabled={!url.trim()}>
                        {shared("load")}
                    </Button>
                </Flex>
                {state.kind === "loading" && (
                    <Flex gap={2} alignItems="center" fontSize="xs">
                        <Spinner size="xs" />
                        {shared("loading")}
                    </Flex>
                )}
                {state.kind === "error" && (
                    <Text fontSize="xs" color="fg.error" role="alert">
                        {state.message}
                    </Text>
                )}
            </Stack>

            {state.kind === "loaded" && (
                <Stack gap={1}>
                    <chakra.label htmlFor={layerInputId} fontSize="xs" fontWeight="semibold">
                        {specific("layer")}
                    </chakra.label>
                    <Input
                        ref={layerRef}
                        id={layerInputId}
                        size="xs"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={search.results.length > 0}
                        aria-controls={search.listId}
                        aria-activedescendant={search.activeOption ? search.optionId(search.activeIndex) : undefined}
                        placeholder={shared("layerPlaceholder")}
                        value={search.query}
                        onChange={changeLayerQuery}
                        onKeyDown={onLayerKeyDown}
                    />
                    {/* Directly below the input: the list can be long. */}
                    {checking && (
                        <Flex gap={2} alignItems="center" fontSize="xs">
                            <Spinner size="xs" />
                            {specific("checking")}
                        </Flex>
                    )}
                    {error && (
                        <Text fontSize="xs" color="fg.error" role="alert">
                            {error}
                        </Text>
                    )}
                    <Text fontSize="xs" color="fg.muted">
                        {search.query.trim() === ""
                            ? specific("hint", { count: search.results.length })
                            : search.results.length === 0
                              ? specific("noResults")
                              : shared("matches", { count: search.results.length })}
                    </Text>
                    <LayerList<Entry>
                        search={search}
                        label={specific("layer")}
                        groupLabel={shared("group")}
                        onPick={add}
                    />
                </Stack>
            )}

            <Flex gap={1} justifyContent="flex-end">
                <Button size="xs" variant="ghost" onClick={onClose}>
                    <LuX />
                    {shared("close")}
                </Button>
                {state.kind === "loaded" && (
                    <Button size="xs" onClick={addActiveLayer} disabled={!search.activeOption || checking}>
                        {shared("add")}
                    </Button>
                )}
            </Flex>
        </Stack>
    );
}

/**
 * Row below the TOC title to add a layer of a service for this session (e.g. a WMS layer):
 * enter the service URL, then find the layer by name or title.
 */
export function AddServiceLayer<Capabilities, Entry extends SearchOption>({
    service
}: {
    service: UserService<Capabilities, Entry>;
}) {
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

    const toggleForm = () => setOpen(!open);
    const closeForm = () => setOpen(false);
    const showAdded = (title: string) => {
        setStatus(intl.formatMessage({ id: "addService.added" }, { title }));
        setOpen(false);
    };

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
                    onClick={toggleForm}
                >
                    <LuPlus />
                    {intl.formatMessage({ id: `${service.messages}.toggle` })}
                </Button>
            </Flex>
            {/* Announces added layers, also while the form is closed. */}
            <Text role="status" fontSize="xs" color="fg.muted" px={2}>
                {status}
            </Text>
            {open && (
                <AddServiceForm id={formId} service={service} urlRef={urlRef} onAdded={showAdded} onClose={closeForm} />
            )}
        </Box>
    );
}
