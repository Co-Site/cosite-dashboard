import { Box } from "@chakra-ui/react";
import { AnyLayer, useMapModelValue } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { TocApi, TocItem } from "@open-pioneer/toc";
import { ReactNode, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Returns additional content for a TOC item (or `undefined` for none). */
export type TocItemContentRenderer = (layer: AnyLayer) => ReactNode;

export interface TocItemExtensionsProps {
    /** The API of the `Toc` component (from its `onReady` event). */
    api: TocApi | undefined;
    render: TocItemContentRenderer;
}

/**
 * Extends the items of the (unmodified) `Toc` component with additional content,
 * e.g. a transparency slider below the layer title.
 *
 * Uses the TOC's public API: every item exposes its DOM element (`TocItem.htmlElement`, reactive).
 * A container is appended to that element and the content is rendered into it via a React portal,
 * so it stays part of this app's React tree (context, i18n, state).
 *
 * Note: The content is always appended at the end of the item, i.e. below the title for items without
 * visible children (e.g. WMS layers whose sublayers are hidden in the TOC).
 */
export function TocItemExtensions({ api, render }: TocItemExtensionsProps) {
    // Reactive: re-evaluated when items are (un)registered by the TOC.
    const items = useReactiveSnapshot(() => api?.getItems() ?? [], [api]);
    return items.map((item) => <TocItemExtension key={item.id} item={item} render={render} />);
}

function TocItemExtension({ item, render }: { item: TocItem; render: TocItemContentRenderer }) {
    const map = useMapModelValue();
    // Reactive: changes when the TOC (re-)renders the item.
    const element = useReactiveSnapshot(() => item.htmlElement, [item]);
    const layer = item.layerId ? map.layers.getLayerById(item.layerId) : undefined;
    const content = layer ? render(layer) : undefined;
    if (!element || content == null || content === false) {
        return null;
    }
    return <ItemPortal element={element}>{content}</ItemPortal>;
}

function ItemPortal({ element, children }: { element: HTMLElement; children: ReactNode }) {
    const [container, setContainer] = useState<HTMLElement>();
    useLayoutEffect(() => {
        const div = element.ownerDocument.createElement("div");
        div.className = "toc-layer-item-extra";
        element.appendChild(div);
        setContainer(div);
        return () => {
            div.remove();
            setContainer(undefined);
        };
    }, [element]);

    if (!container) {
        return null;
    }
    return createPortal(
        // Aligned with the item title: collapse button + gap + checkbox control and label gap.
        <Box
            paddingInlineStart="calc(2.25rem + 0.5rem + 1.625rem)"
            paddingInlineEnd={2}
            paddingBottom={2}
        >
            {children}
        </Box>,
        container
    );
}
