# Dashboard: How the project is wired

Quick reference for how the workspace, Vite, apps, services and packages fit together.
Why something is solved the way it is and which alternatives existed: [DashboardDecisions.md](./DashboardDecisions.md).
The original samples of the Trails Starter (`src/samples/*`, `src/packages/sample-package`,
`src/apps/empty`, `src/sites/empty`) have been removed; they are still available on the `main` branch.

## pnpm workspace

- `pnpm-workspace.yaml` → `packages: src/**`: every directory under `src/` with a `package.json` is a workspace
  package.
- Versions are maintained centrally in the `catalog:`; the `package.json` files only contain `"<paket>": "catalog:"`.
  The Trails OpenLayers packages share one version via the YAML anchor `&ol_base_packages_version`,
  the core packages via `&core_packages_version`.
- Adding a new Trails package: add an entry to the catalog, then reference it with `catalog:` in the app's
  `package.json`, `pnpm install`.

## Vite

- `vite.config.ts`: `root: src`, build output to `dist/www`.
- Plugin `pioneer({ rootSite, sites, apps })`:
    - `rootSite: true` → `src/index.html` is built. This page currently hosts the dashboard app directly.
    - `sites: [...]` → further folders with their own `index.html` (e.g. `"sites/foo"`).
    - `apps: [...]` → apps that are additionally delivered as standalone `.js` files (embedding).
- A site loads an app via `<script type="module" src="./apps/<app>/app.ts">` and contains the custom element
  (e.g. `<dashboard-app>`).
- `server.proxy` and `preview.proxy` (`SERVICE_PROXIES`): forward `/proxy/leverkusen/…` to
  `https://geoportal.leverkusen.de/…`, see [Proxy for services without CORS](#proxy-for-services-without-cors).

## App structure (`src/apps/dashboard`)

| File               | Purpose                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`     | Package name + dependencies (all via `catalog:`)                                                                                                                                                                                               |
| `build.config.mjs` | `defineBuildConfig({ i18n, styles, services, ui })` – languages, CSS, service registration, UI references                                                                                                                                      |
| `app.ts`           | `createCustomElement({ component, appMetadata })` + `customElements.define("dashboard-app", ...)`                                                                                                                                              |
| `services.ts`      | Service classes, e.g. `MainMapProvider` (map configuration)                                                                                                                                                                                    |
| `DashboardApp.tsx` | Root component: map, TOC, map tools, analysis panel                                                                                                                                                                                            |
| `i18n/*.yaml`      | Translations, accessed via `useIntl().formatMessage({ id })`                                                                                                                                                                                   |
| `dataLayers/`      | Data layers: `config/` (JSON schema `types.ts`, loader + parser `loadDataLayers.ts`, texts per language), `ows/` (WMS, WFS), `sta/` (SensorThings), layer factory `createDataLayer.ts` with `dataLayerBase.ts`, session groups `userLayers.ts` |
| `mapClick/`        | Map click: popup with all sensors at the location or with the attributes of WFS features and WMS GetFeatureInfo                                                                                                                                |
| `charts/`          | Analysis panel at the bottom (`AnalysisPanel.tsx`, tabs "Einzelsensor" / "Sensorvergleich" / "Messgrößenvergleich"), time filter, sensor and type selection, loading measurements, charts: line, bar, box plot, wind rose                      |
| `toc/`             | Additions to the TOC: transparency slider, language switcher (EN/DE), translation of layer names, adding custom WMS/WFS                                                                                                                        |

## Data layers (`src/public/config/dataLayers.json`)

The map's data layers are not fixed in the code but are listed in a JSON file that the app loads **at runtime**.

- The file lives in `src/public/` (Vite's `publicDir`) and is copied unchanged to `dist/www/config/dataLayers.json`
  during the build. After deployment it can be changed on the web server without rebuilding. In the Docker deployment
  this only works once a bind mount for the config directory is added to `compose.yml`, see
  [Deployment.md](./Deployment.md#configuration).
- No backend: the browser loads it via `fetch` and parses it with `response.json()` (`dataLayers/config/loadDataLayers.ts`).
- Different source (bucket, API …): set `VITE_DATA_LAYERS_URL`, e.g. in `.env.local`. The server must then allow CORS.
- If the file is unreachable or invalid, the map starts with the basemap only. The error appears in the browser console.
  Individual invalid entries are skipped with a warning.

### Structure: categories and layers

`layers` is a list of layers and categories. A category (`"type": "group"`) itself has a
`layers` list and can be nested arbitrarily. Categories appear in the TOC as collapsible groups
and can be switched on and off as a whole. Currently there are the categories "WMS" and "Sensoren (STA)".

The order in the file is the drawing order: later entries lie on top on the map
and appear higher up in the TOC.

```json
{
    "layers": [
        {
            "id": "wms",
            "type": "group",
            "name": "WMS",
            "layers": [{ "id": "dwd-icon-t2m", "type": "wms", "...": "..." }]
        },
        {
            "id": "sta",
            "type": "group",
            "name": "Sensoren (STA)",
            "layers": [{ "id": "sta-ds-14", "type": "sta-datastream", "...": "..." }]
        }
    ]
}
```

### Fields

| Field                     | Required    | Meaning                                                                               |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `id`                      | yes         | Unique ID (across the whole file), also the layer ID in the map                       |
| `type`                    | yes         | `group`, `wms`, `wfs` or `sta-datastream`                                             |
| `name`                    | yes¹        | Display name in the TOC (text or per language, see below)                             |
| `description`             | no          | Description in the layer's ⋮ menu (text or per language)                              |
| `visible`                 | no          | Initially visible (default `true`)                                                    |
| `opacity`                 | no          | Opacity 0–1 (default `1`)                                                             |
| `layers`                  | for `group` | Contained layers and categories                                                       |
| `endpoint`                | for layers  | URL of the service (WMS/WFS base URL or URL of the SensorThings datastream)²          |
| `attribution`             | no          | Source attribution on the map                                                         |
| `wms.layers`              | for `wms`   | List of WMS layer names from the capabilities                                         |
| `wms.featureInfo.enabled` | no          | GetFeatureInfo on map click (default `true`)                                          |
| `wms.featureInfo.format`  | no          | Response format (GeoJSON); if omitted, taken from the capabilities, see below         |
| `wms.featureInfo.fields`  | no          | Attributes to display `{ property, label?, unit? }`; if omitted: all                  |
| `wms.legend.enabled`      | no          | Legend in the FeatureInfo popup (default `true`)                                      |
| `wms.legend.url`          | no          | Custom legend URL instead of capabilities/GetLegendGraphic                            |
| `wms.legend.params`       | no          | Additional URL parameters, e.g. `{ "LEGEND_OPTIONS": "columns:4;fontSize:9" }`        |
| `wfs.featureType`         | for `wfs`   | Name of the feature type from the capabilities, e.g. `app:bezirke`                    |
| `wfs.version`             | no          | `2.0.0` or `1.1.0`; if omitted, the newest one the service supports                   |
| `wfs.outputFormat`        | no          | GetFeature format; if omitted, taken from the capabilities (GeoJSON before GML)       |
| `wfs.maxFeatures`         | no          | Maximum number of features per request (default `1000`)                               |
| `wfs.color`               | no          | Color of the features (CSS); if omitted, derived from the layer ID                    |
| `wfs.featureInfo.enabled` | no          | Show attributes on map click (default `true`)                                         |
| `wfs.featureInfo.fields`  | no          | Attributes to display, as in `wms.featureInfo.fields`                                 |
| `observedProperty`        | no          | Only `sta-datastream`: key of the observed property, e.g. `soil_temperature`³         |
| `unit`                    | no          | Only `sta-datastream`: unit of the measurements, e.g. `°C`; if omitted, from the STA³ |

¹ Optional for `wms` and `wfs`: without `name`, the TOC shows the title from the capabilities (language of the
service, usually German), and until then the layer name or the name of the feature type. Without `description`, the
abstract is used if it differs from the title.
For this, the app loads the capabilities itself (`dataLayers/ows/wmsCapabilities.ts` or `wfsCapabilities.ts`, without
`LANGUAGE`, once per service).
If a WMS entry has several `wms.layers`, the sublayers always get their titles from the capabilities.

² Relative URLs (e.g. `./proxy/leverkusen/GCGisService`) are resolved by `parseDataLayers` against the app's URL. This
way the same entry works locally and on the server, see [Proxy for services without CORS](#proxy-for-services-without-cors).

³ Observed property and unit are set directly on the sensor; there is no central list. Sensors with the same
`observedProperty` count as the same observed property (basis for the comparison by observed property, see `TODO.md`).
`unit` replaces the unit from the STA; no conversion takes place.

**Note for maintenance:** The configuration is responsible. Whoever maintains `dataLayers.json` names the sensors
carefully, uses the same key everywhere for the same observed property (same spelling) and enters the unit in which
the sensor actually measures. The app only checks that the values are texts. It does not reconcile keys or units
with each other (background: `DashboardDecisions.md`, overview).

**FeatureInfo format:** The app only reads GeoJSON. Without `format`, it picks `application/json` from the
capabilities (GeoServer), otherwise `application/geo+json` (ArcGIS, MapServer). If the service offers neither or the
layer is not `queryable`, it is not queried on map click. A fixed `format` saves loading the capabilities
(about 1 MB for DWD), which is why it is set for the DWD layers in the configuration.

**Attribution:** Only `attribution` from the configuration. Otherwise `@open-pioneer/map` would show the service's
`AccessConstraints` or `Fees` as source attribution (a bare URL for DWD).

Example WMS layer:

```json
{
    "id": "dwd-icon-t2m",
    "type": "wms",
    "name": "Lufttemperatur 2 m (DWD ICON)",
    "description": "Vorhersage der Lufttemperatur in 2 m Höhe …",
    "endpoint": "https://maps.dwd.de/geoserver/dwd/wms",
    "opacity": 0.6,
    "wms": {
        "layers": ["Icon_reg025_fd_sl_T2M"],
        "featureInfo": {
            "fields": [
                {
                    "property": "Temperature_height_level_above_ground",
                    "label": "Lufttemperatur 2 m",
                    "unit": "°C"
                },
                { "property": "TIME", "label": "Gültig für" }
            ]
        }
    }
}
```

### Multilingual texts

`name`, `description` and `wms.featureInfo.fields[].label` are either a plain text (applies to all languages)
or an object with one text per language:

```json
"name": { "de": "Lufttemperatur 2 m (DWD ICON)", "en": "Air temperature 2 m (DWD ICON)" }
```

If the current language is missing, English is used, otherwise the first entry (`dataLayers/config/localizedText.ts`).

### Layer types

- **`group`** → `GroupLayer` from `@open-pioneer/map`, children are created recursively.
- **`wms`** → `WMSLayer` from `@open-pioneer/map`. With exactly one WMS layer, the sublayer is hidden in the TOC.
- **`wfs`** → `SimpleLayer` + OL `VectorLayer` (`dataLayers/ows/wfsLayer.ts`). Only the map extent is loaded
  (`bbox` strategy) in a projected CRS (EPSG:3857, otherwise 25832/25833), as GeoJSON or GML. Style per
  geometry type in the layer's color (`dataLayers/ows/wfsStyle.ts`). Background: `DashboardDecisions.md`, section 19.
- **`sta-datastream`** → point layer (`SimpleLayer` + OL `VectorLayer`) at the location of the thing.
  Among other things, the feature carries `observationsUrl`, `unit` and `name` (see `StaDatastreamProperties` in
  `dataLayers/sta/sta.ts`).
  `unit` is the sensor's configured unit, otherwise the one from the STA.
  `healthCheck` on the endpoint marks the layer in the TOC as unavailable if the service does not respond.

Every created layer has the original configuration in the attribute `dataLayer` (`layer.attributes.dataLayer`).
Through it, the map click finds e.g. the `featureInfo` settings of a WMS layer.

### Adding a new layer type

1. In `dataLayers/config/types.ts`, create a new interface with its own `type`, add it to the union `DataLayerConfig`
   and check the type-specific fields in `validateEntry` (`dataLayers/config/loadDataLayers.ts`).
2. Put the creation of the layer into its own file in the type's folder (e.g. `ows/wmsLayer.ts`, `sta/staLayer.ts`).
   Shared parts (`commonOptions`, `getDataLayerConfig`, title from capabilities) come from `dataLayerBase.ts`.
   Add a `case` for the new type in `dataLayers/createDataLayer.ts`. TypeScript reports missing cases.
3. Extend the test in `dataLayers/loadDataLayers.test.ts` and add the type to this documentation.

## Map click, popup and charts

`mapClick/useMapClick.tsx` listens for clicks on the map:

1. **Sensor point hit** (5 px tolerance, the mouse pointer becomes a hand): the datastream is selected and the
   analysis panel (`charts/AnalysisPanel.tsx`) is opened. The state (`datastream`, `timeFilter`, `panelOpen`) lives in
   `DashboardApp.tsx`.
2. **Otherwise**: the features of visible WFS layers at the location provide their attributes directly
   (`getWfsFeatureInfo`, without a request) and are highlighted. All visible WMS layers with active FeatureInfo are
   queried via `GetFeatureInfo` (GeoJSON) (`mapClick/featureInfo.ts`). The result appears as a popup (`map.overlays`)
   at the click position, WFS before WMS.
   Numbers are localized, ISO timestamps are shown in local time. Below them is the layer's **legend**
   (`mapClick/WmsLegend.tsx`, URLs in `mapClick/legendUrls.ts`). If the popup gets too tall, only the content scrolls;
   title and ✕ stay visible.
   A **marker** appears at the click position (`mapClick/clickMarker.ts`, via `map.highlights`). The popup is placed
   **next to** the marker, with its top edge below the click (at the right edge, to the left of it). If it does not fit
   below, it is pushed up far enough to be fully visible between the analysis panel and the top edge of the map
   (`mapClick/popupPlacement.ts`). The placement is recalculated when the size of the popup or the map changes.

**Legend URL:** Preferably from the capabilities (`sublayer.legend`), otherwise a standard `GetLegendGraphic` request.
Background: `@open-pioneer/map` 1.5.0 always requests the capabilities with `LANGUAGE=ger`, the DWD GeoServer responds
to that with an error, and the map then gets no legend URL. With `wms.legend.params`, the legend can be drawn compactly
on the server side (GeoServer: `LEGEND_OPTIONS`, `WIDTH`, `HEIGHT`). That is sharper than an image scaled down in the
browser.

In the analysis panel (`charts/AnalysisPanel.tsx`):

- **Time filter** (`charts/TimeRangeFilter.tsx`): presets 24 hours, 7 days (default), 30 days or a custom range
  from/to. Invalid input (from ≥ to) is marked, the last valid range stays active.
- **Chart** (`charts/DatastreamChart.tsx`, `charts/SeriesChart.tsx`): loads the datastream's measurements in the
  range (`fetchObservations` in `dataLayers/sta/sta.ts`, follows `@iot.nextLink`, max. 20,000 values) and shows them as
  a line chart with tooltip and crosshair. Gaps in the data remain visible as gaps. Above it are
  count, min, max and latest value.
- **Sensor unavailable**: if loading the datastream fails (error, 30 s timeout, no location),
  `createStaDatastreamLayer` (`dataLayers/sta/staLayer.ts`) sets the source to `error`. This becomes `layer.loadState`:
  the TOC marks the layer, the panel shows a red notice instead of the spinner via `useSensorLoadFailed`
  (`dataLayers/sta/useStaSensors.ts`).
  Assumptions of the STA hooks (one layer, one datastream) are in `DashboardDecisions.md`, section 8.
- **Other sensors at the location** (`charts/SensorTiles.tsx`): `SensorChartView` uses `useColocatedSensors`
  (`dataLayers/sta/useStaSensors.ts`) to get the other sensors at the location of the selected sensor. The hook listens
  to all STA sources, so the tiles appear as soon as the datastreams are loaded. Grouping follows
  `VITE_SENSOR_GROUPING` (`location` = default, `thing`, `location-or-thing`; `dataLayers/sta/colocation.ts`) and
  `VITE_SENSOR_GROUPING_RADIUS` (meters, default 1); for this, the datastream properties on the feature
  (`getDatastreamProperties`) carry `position` and `thingId`. Each tile loads the latest value
  (`fetchLatestObservation`), a click calls the dropdown's `onChange`.
- **Observed property comparison** (`charts/PropertyComparisonView.tsx`): third tab. `useObservedProperties`
  (`dataLayers/sta/useStaSensors.ts`) reads the `observedProperty` keys from the configuration of the STA layers and
  returns the observed properties with at least two sensors (`observedPropertyGroups` in
  `dataLayers/sta/observedProperties.ts`). The name in the dropdown comes from the i18n files
  (`observedProperty.<key>`); without a translation, the key is shown. `useSeriesObservations` loads the measurements
  for each sensor separately, `SeriesChart` draws them as lines in one chart (in the station colors, see below). The
  sensors are shown as tiles next to it (`SensorTiles` with `hidden`): a click hides or shows
  a series. The observed property and the hidden sensors are kept in `AnalysisSelection.property`
  (`charts/analysisSelection.ts`).
- **Station colors**: `assignStations` (`dataLayers/sta/colocation.ts`) divides the loaded sensors into stations
  (same grouping as the tiles, a single sensor is also a station), `stationColor`
  (`dataLayers/sta/stationColors.ts`) gives each station one of 20 colors. `useStationColors`
  (`dataLayers/sta/useStaSensors.ts`) returns the color per layer ID. Used by: `StationPointStyles` (sets the
  style of the sensor points on the map, mounted in `DashboardApp.tsx`), `StationDot` in the TOC
  (`toc/layerItemContent.tsx`), the border of the tiles and all charts (color per series in `SeriesChart`, `color` prop
  of `BarChart`, `BoxPlotChart`, `WindRoseChart`).
- **Chart.js instead of recharts**: Trails renders the app in the Shadow DOM. recharts looks up portals via `document`
  and had to be patched for that (see old branch `origin/test/charts`). Chart.js draws on canvas and does not need
  this.
- Units from the STA are translated for display (`degC` → `°C`, see `displayUnit` in `dataLayers/sta/sta.ts`).
  A `unit` given in the configuration is displayed unchanged and takes precedence.

## TOC and transparency slider

The TOC is the unmodified `@open-pioneer/toc`. Custom content per layer is added via its public API
(`toc/TocItemExtensions.tsx`):

- `Toc` reports a `TocApi` in `onReady`. `TocItemExtensions` reactively reads all entries from it (`api.getItems()`)
  and their DOM element (`TocItem.htmlElement`).
- For each layer it calls `layerItemContent(layer)` (`toc/layerItemContent.tsx`). If content is returned, a
  `<div class="toc-layer-item-extra">` is appended to the end of the entry and the content is rendered into it via
  `createPortal`.
- This way the dashboard provides a **transparency slider** below the title for every WMS and WFS layer
  (0 % = opaque, initial value from `opacity` in the JSON). For WFS layers, a **color swatch** with the color of the
  features is placed in front of it.
- Background and risks: [DashboardDecisions.md](./DashboardDecisions.md), section 9.
- Temporary layers (see below) get a **remove button** next to the slider.
- If the map image of a WMS layer fails to load or a WFS layer loads no features (exception, HTTP error), a
  **warning** is shown above the slider until loading works again (`toc/LayerLoadWarning.tsx`). If a WFS layer has
  reached the maximum number of features, it shows "Nicht alle Features geladen".
- **TOC panel** (`toc/TocPanel.tsx`): contains the heading, language switcher, "WMS hinzufügen", "WFS hinzufügen" and
  `Toc`. It can be collapsed to the left; then only a layers button remains in the top left. The panel is deliberately
  **not** placed in a `MapAnchor`, but as a separate layer above the map: `MapAnchor` clips content
  (`overflow: hidden`) and intercepts map clicks in its area. The frame has `pointer-events: none`; only the panel and
  the button respond to clicks.

## Custom WMS and WFS (temporary)

Below the TOC title, "WMS hinzufügen" and "WFS hinzufügen" each open a form. Both use the same building blocks:
form `toc/AddServiceLayer.tsx`, loading the service in `toc/useServiceCapabilities.ts`, search in `toc/LayerSearch.tsx`
(ranking in `searchLayers`), session group in `dataLayers/userLayers.ts`. What differs per service type
(capabilities, entries, validation, layer configuration) is in `toc/userServices.ts` (`WMS_SERVICE`, `WFS_SERVICE`).
Shared texts are under `addService.*`, type-specific ones under `addWms.*` or `addWfs.*`. Nothing is saved;
after a reload the layers are gone.

1. Enter the **service URL** and load it. A pasted GetCapabilities URL is cleaned up
   (`SERVICE`, `REQUEST`, `VERSION`, `LANGUAGE`, `TYPENAME(S)` removed, other parameters such as `map=` are kept;
   `normalizeServiceEndpoint` in `dataLayers/ows/owsService.ts`). `fetchWmsCapabilities` loads the capabilities 1.3.0
   once per service and session, `fetchWfsCapabilities` with
   `ACCEPTVERSIONS=2.0.0,1.1.0` (the service responds with the newest version it supports).
2. **Choose a layer:** without input, all layers are shown in a scrollable list. The search field filters them
   (`searchLayers`): exact name first, then matches in the title, then in the name. Arrow keys and Enter; clicking an
   entry adds it.
3. **"Hinzufügen"** (WMS) builds a normal `WmsDataLayerConfig` with `temporary: true`: title from the capabilities,
   abstract and provider/terms of use/fees as the description (info icon in the TOC), FeatureInfo format as above or
   off. Rejected are layers without EPSG:3857, duplicate layers and layers for which the service delivers no image
   (probe GetMap with 1 × 1 pixel, `probeWmsLayer`; e.g. the named folder groups of the DWD).

The layers are placed in the group **"Eigene WMS"** (`user-wms`) directly below the group with the configured
WMS layers (`dataLayers/userLayers.ts`). Groups in `@open-pioneer/map` have fixed children, so the group is rebuilt
on every add or remove; visibility and opacity of the layers are carried over. The newest
layer is on top. Without custom layers, the group disappears. The UI reaches the `LayerFactory` via
`useService("map.LayerFactory")` (in `build.config.mjs` under `ui.references`).

**WFS:** "Hinzufügen" builds a `WfsDataLayerConfig` with `temporary: true`: title and description as for WMS, the
next color of the palette. Rejected are duplicate feature types, feature types without GeoJSON and GML output and
those for which the service delivers no feature (probe GetFeature with one feature, `probeWfsFeatureType`). The
layers are placed in the group **"Eigene WFS"** (`user-wfs`) directly above the topmost layer with WMS layers, i.e.
above the map images and below the sensors.

For temporary layers, `WMSLayer` does not load capabilities (`fetchCapabilities: false`); the app already has them.
The legend then comes from the `LegendURL` of the capabilities, otherwise via GetLegendGraphic. Legend images that do
not load are hidden.

## Proxy for services without CORS

The browser only gives a script the response of a foreign server if that server sends `Access-Control-Allow-Origin`.
`@open-pioneer/map` loads WMS images and capabilities via `fetch`, and so does the app for FeatureInfo. Without the
header, the layer stays empty. For such services, the browser sends the request to the dashboard's server (same
origin, no CORS check), which forwards the request to the service.

- **Configuration:** `endpoint` relative to the app, e.g. `./proxy/leverkusen/GCGisService`.
- **Local:** `pnpm dev` and `pnpm preview` forward `/proxy/leverkusen/` via Vite (`SERVICE_PROXIES` in
  `vite.config.ts`).
- **Production:** the web server that delivers the dashboard needs the same path relative to the app. In the
  Docker image, `nginx_default.conf` handles this (dashboard under `/umwelt-monitoring/`, pitfalls see
  [Deployment.md](./Deployment.md#proxy-for-services-without-cors)):

```nginx
location = /umwelt-monitoring/proxy/leverkusen/GCGisService {
    proxy_pass https://geoportal.leverkusen.de/GCGisService;
    proxy_ssl_server_name on;
}
```

- The target is fixed in the configuration. Never take the target URL from the request, otherwise it is an open
  proxy.
- In production, only allow the endpoints that `dataLayers.json` uses (exact `location =`), not the whole host.
  A new endpoint needs its own `location` in `nginx_default.conf`.
- If there is a load balancer or ingress in front of nginx, it must let the path through.
- Custom WMS (temporary) do not go through the proxy; services without CORS still cannot be added there.

## Deployment

See [Deployment.md](./Deployment.md).

## Language (i18n)

- Supported languages: `en`, `de` (`build.config.mjs` → `i18n`, texts in `i18n/*.yaml`; the TOC brings its own
  texts).
- **Default language English**, regardless of the browser language (`config.locale` in `app.ts`).
- **Live switching without restart**: `advanced.enableLiveLocaleChanges` in `app.ts`. Map extent, selection and time
  filter are preserved.
- **Language switcher EN | DE** next to "Ebenen" in the TOC (`toc/LanguageSelector.tsx`, Chakra `SegmentGroup`, uses
  `runtime.LocaleService`).
- Layer names from the JSON are created in the current language at startup (`MainMapProvider` gets the
  `LocaleService` injected) and updated on every switch via `useLocalizedDataLayers()` (`layer.setTitle`).
- Popup and chart titles read the layer name live from the map (`dataLayers/useLayerTitle.ts`).
- Data from the server (e.g. datastream name from the STA) is not translated and appears in small type next to the
  title.
- Limitation: the native date fields in the time filter format according to the browser language, not the app
  language.

## Services

- Export the class in `services.ts` and register it in `build.config.mjs`:
  `services: { MainMapProvider: { provides: ["map.MapConfigProvider"] } }`.
- Dependencies between services: `references: { name: "interface.name" }` in the service entry.
- Using services from React: add `ui: { references: ["interface.name"] }` in `build.config.mjs`
  and call `useService<T>("interface.name")` (from `open-pioneer:react-hooks`) in the component.

## Map

- `MainMapProvider` implements `MapConfigProvider` with `mapId = MAP_ID` and provides `initialView`, `projection`,
  `baseLayers` (and later `layers`).
- In React: `useMapModel(MAP_ID)` → `<DefaultMapProvider map={map}>` → `<MapContainer>`; UI elements on the map via
  `<MapAnchor position="top-left" | ...>`.
- Components such as `<Toc />`, `<ZoomIn />` find the map automatically via the `DefaultMapProvider`.

## Local packages

- There are currently no local packages under `src/packages/`.
- New package under `src/packages/<name>/` with its own `package.json` (+ `build.config.mjs` if it has
  services/i18n/styles).
- Include it in the app: `"<name>": "workspace:*"` in the app's `package.json`, `pnpm install`.
- `typedoc.config.mjs` documents all packages under `src/packages/**`. The CI step `pnpm build-docs` is removed
  as long as there are no local packages; add it back to `.github/workflows/test-and-build.yml` afterwards.

## Tests

- Vitest with `happy-dom`, setup in `src/testing/global-setup.ts`; test files `*.test.ts(x)` next to the code.
- See [How to write tests](./tutorials/HowToWriteTests.md).
