import { createCustomElement } from "@open-pioneer/runtime";
import * as appMetadata from "open-pioneer:app";
import { DashboardApp } from "./DashboardApp";

const element = createCustomElement({
    component: DashboardApp,
    appMetadata,
    config: {
        // Default language (can be changed by the user at runtime).
        locale: "en"
    },
    // Switch the language without restarting the app (keeps map view, selection and time filter).
    advanced: {
        enableLiveLocaleChanges: true
    }
});

customElements.define("dashboard-app", element);
