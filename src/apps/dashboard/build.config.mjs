import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    i18n: ["de", "en"],
    services: {
        MainMapProvider: {
            provides: ["map.MapConfigProvider"],
            references: {
                localeService: "runtime.LocaleService"
            }
        }
    },
    ui: {
        references: ["runtime.LocaleService", "map.LayerFactory"]
    }
});
