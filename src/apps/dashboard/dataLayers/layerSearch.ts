/** What the search needs of a layer from the capabilities (WMS layer or WFS feature type). */
export interface SearchableLayer {
    name: string;
    title: string;
}

/**
 * Filters layers by name or title (case-insensitive); without a query all layers are returned, in document order.
 * An exact name comes first, then title matches, then name matches.
 */
export function searchLayers<T extends SearchableLayer>(layers: T[], query: string): T[] {
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
