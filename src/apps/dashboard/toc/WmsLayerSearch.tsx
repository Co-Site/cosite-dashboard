import { Badge, Box, Text } from "@chakra-ui/react";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchLayers } from "../dataLayers/layerSearch";
import { WmsCapabilitiesLayer } from "../dataLayers/wmsCapabilities";

/**
 * State of the layer search (a combobox): the search text, the matching layers and the active result,
 * which is moved with the arrow keys. Without `layers` (service not loaded) there are no results.
 */
export function useWmsLayerSearch(layers: WmsCapabilitiesLayer[] | undefined) {
    const listId = useId();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const results = useMemo(() => (layers ? searchLayers(layers, query) : []), [layers, query]);
    const activeLayer = results[Math.min(active, results.length - 1)];
    const activeIndex = activeLayer ? results.indexOf(activeLayer) : -1;

    const changeQuery = (value: string) => {
        setQuery(value);
        setActive(0);
    };
    const move = (step: number) => setActive((index) => Math.max(0, Math.min(results.length - 1, index + step)));
    const optionId = (index: number) => `${listId}-${index}`;

    return { listId, query, changeQuery, results, activeLayer, activeIndex, setActive, move, optionId };
}

export type WmsLayerSearchState = ReturnType<typeof useWmsLayerSearch>;

/**
 * The matching layers as listbox of the search combobox. Hovering activates a result, clicking picks it.
 * The active result is kept visible while moving through the list with the arrow keys.
 */
export function WmsLayerList(props: { search: WmsLayerSearchState; onPick(layer: WmsCapabilitiesLayer): void }) {
    const { search, onPick } = props;
    const { listId, results, activeLayer, activeIndex, setActive, optionId } = search;
    const intl = useIntl();
    const listRef = useRef<HTMLUListElement>(null);
    useEffect(() => {
        listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    if (results.length === 0) {
        return null;
    }
    return (
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
                    onClick={() => onPick(layer)}
                >
                    <Text fontSize="xs" fontWeight="semibold" lineClamp={2}>
                        {layer.title}
                        {layer.isGroup && (
                            <Badge size="xs" variant="outline" ms={1} verticalAlign="middle">
                                {intl.formatMessage({ id: "addWms.group" })}
                            </Badge>
                        )}
                    </Text>
                    <Text fontSize="2xs" color="fg.muted" truncate>
                        {[layer.name, ...layer.path].join(" · ")}
                    </Text>
                </Box>
            ))}
        </Box>
    );
}
