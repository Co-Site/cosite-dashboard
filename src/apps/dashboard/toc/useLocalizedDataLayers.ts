import { MapModel } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { LocaleService } from "@open-pioneer/runtime";
import { useService } from "open-pioneer:react-hooks";
import { useEffect } from "react";
import { localizeDataLayers } from "../dataLayers/createDataLayer";

/**
 * Keeps names and descriptions of the data layers in sync with the current language.
 */
export function useLocalizedDataLayers(map: MapModel | undefined) {
    const localeService = useService<LocaleService>("runtime.LocaleService");
    const language = useReactiveSnapshot(() => localeService.messageLocale.language, [localeService]);
    useEffect(() => {
        if (map) {
            localizeDataLayers(map, language);
        }
    }, [map, language]);
}
