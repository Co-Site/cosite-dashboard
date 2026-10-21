import { useEffect, useRef, useState } from "react";

/**
 * Open state of a collapsible panel with one button to close it (inside the panel) and one to open it again.
 *
 * `toggle()` also moves the focus to the button that is visible afterwards, so keyboard users do not lose it.
 * `setOpen()` changes the state without moving the focus (e.g. when the app opens the panel itself).
 */
export function usePanelToggle(initialOpen: boolean) {
    const [open, setOpen] = useState(initialOpen);
    const openButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const toggled = useRef(false);

    useEffect(() => {
        if (toggled.current) {
            toggled.current = false;
            (open ? closeButtonRef : openButtonRef).current?.focus();
        }
    }, [open]);

    const toggle = (value: boolean) => {
        toggled.current = true;
        setOpen(value);
    };

    return { open, setOpen, toggle, openButtonRef, closeButtonRef };
}
