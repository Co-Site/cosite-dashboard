import { Badge, Box, Text } from "@chakra-ui/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/** An entry of the search: a WMS layer or a WFS feature type. */
export interface SearchOption {
    name: string;
    title: string;

    /** Titles of the parent layers, shown below the name. */
    path?: string[];

    /** Whether the entry groups other entries (marked with a badge). */
    isGroup?: boolean;
}

/**
 * Filters layers by name or title (case-insensitive); without a query all layers are returned, in document order.
 * An exact name comes first, then title matches, then name matches.
 */
export function searchLayers<T extends SearchOption>(layers: T[], query: string): T[] {
    const term = query.trim().toLowerCase();
    if (!term) {
        return layers;
    }
    const rank = (layer: T) => {
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
        .filter((match): match is { layer: T; index: number; rank: number } => match.rank !== undefined)
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((match) => match.layer);
}

/**
 * State of the layer search (a combobox): the search text, the matching entries and the active result,
 * which is moved with the arrow keys. Without `options` (service not loaded) there are no results.
 */
export function useLayerSearch<T extends SearchOption>(options: T[] | undefined) {
    const listId = useId();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const results = useMemo(() => (options ? searchLayers(options, query) : []), [options, query]);
    const activeOption = results[Math.min(active, results.length - 1)];
    const activeIndex = activeOption ? results.indexOf(activeOption) : -1;

    const changeQuery = (value: string) => {
        setQuery(value);
        setActive(0);
    };
    const move = (step: number) => setActive((index) => Math.max(0, Math.min(results.length - 1, index + step)));
    const optionId = (index: number) => `${listId}-${index}`;

    return { listId, query, changeQuery, results, activeOption, activeIndex, setActive, move, optionId };
}

export type LayerSearchState<T extends SearchOption> = ReturnType<typeof useLayerSearch<T>>;

interface LayerListProps<T extends SearchOption> {
    search: LayerSearchState<T>;

    /** Accessible name of the list. */
    label: string;

    /** Text of the badge of group entries. */
    groupLabel?: string;
    onPick(option: T): void;
}

/**
 * The matching entries as listbox of the search combobox. Hovering activates a result, clicking picks it.
 * The active result is kept visible while moving through the list with the arrow keys.
 */
export function LayerList<T extends SearchOption>({ search, label, groupLabel, onPick }: LayerListProps<T>) {
    const { listId, results, activeOption, activeIndex, setActive, optionId } = search;
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
            aria-label={label}
            // All entries can be browsed; the TOC panel itself is at most 60vh high.
            maxHeight="min(22rem, 40vh)"
            overflowY="auto"
            borderWidth="1px"
            borderRadius="sm"
            listStyleType="none"
        >
            {results.map((option, index) => (
                <Box
                    as="li"
                    key={option.name}
                    id={optionId(index)}
                    role="option"
                    aria-selected={option === activeOption}
                    paddingX={2}
                    paddingY={1}
                    cursor="pointer"
                    backgroundColor={option === activeOption ? "bg.emphasized" : undefined}
                    _hover={{ backgroundColor: "bg.muted" }}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => onPick(option)}
                >
                    <Text fontSize="xs" fontWeight="semibold" lineClamp={2}>
                        {option.title}
                        {option.isGroup && groupLabel && (
                            <Badge size="xs" variant="outline" ms={1} verticalAlign="middle">
                                {groupLabel}
                            </Badge>
                        )}
                    </Text>
                    <Text fontSize="2xs" color="fg.muted" truncate>
                        {[option.name, ...(option.path ?? [])].join(" · ")}
                    </Text>
                </Box>
            ))}
        </Box>
    );
}
