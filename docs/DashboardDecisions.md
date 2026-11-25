# Dashboard: History and decisions

This document records **why** the COSITE dashboard is built the way it is: which decisions were made, which
alternatives were rejected and where the pitfalls were.
**How** the parts are wired technically is described in [DashboardWiring.md](./DashboardWiring.md).

Every element follows the same pattern: **What** · **Decision** · **Why** · **Rejected** · **Pitfalls** ·
**Open/Risks** · **Commits**. The marker shows how much coordination or debugging was needed:
🟢 easy · 🟡 medium · 🔴 hard.

## Overview

- **Goal:** Turn the _Open Pioneer Trails Starter_ (a mix of how-to and demonstrator) into a lean app:
  background map, TOC, a panel at the bottom with charts after a click on the map.
- **Branches:** Developed on `dashboard` (TOC fork) and `toc-native` (original TOC). `toc-native` was chosen and
  merged into `main`. Repo: `Co-Site/cosite-dashboard`. Since then the flow is feature → `dev` → `main`, see
  [section 16](#16-branches-and-workflow).
- **Way of working:** One commit per completed step, push only to `origin` and only on request. The pre-commit hook runs `tsc`, oxfmt and
  oxlint, so every step has to build on its own.
- **Principle: config before STA (2026-10-30):** A SensorThings server can be configured wrongly or inconsistently
  (e.g. `temperature` and `Temperature` as two ObservedProperties, `°C` and `degC` as the unit). The config straightens
  this out: where it specifies something, it takes precedence over what the STA says. Whatever must be configured for a
  feature and is not, is left out when in doubt, instead of falling back to the STA values.
- **Principle: the configuration is responsible (2026-11-13):** In operation, correctness lies with whoever maintains
  `dataLayers.json`: name sensors carefully, assign the right key for the observed property, enter the matching
  unit. This is intended, not an oversight. The dashboard only checks the shape of the values (types), not their
  content: it does not cross-check keys, does not compare units and does not convert.
- **Observed property and unit on the sensor (2026-11-13):** Every `sta-datastream` can carry `observedProperty` (key,
  e.g. `soil_temperature`) and `unit`. The unit takes precedence over the STA's `unitOfMeasurement`.
    - **Rejected:** a central list of observed properties (key, name de/en, unit) that sensors refer to. It would have
      enforced a uniform unit per observed property and provided a translated name, but it would have added a second
      place to the configuration. Keeping everything on the sensor is simpler to read and maintain.
    - **Consequences:** The name of the observed property still comes from the STA (detail line in the sensor popup, not
      translated). For the selection in the comparison by observed property there is no translated name yet (open, see
      `TODO.md`). So far the key is only validated; it is first read by the comparison, via the configuration on the
      layer.

| #   | Element                                                                           | Difficulty |
| --- | --------------------------------------------------------------------------------- | ---------- |
| 1   | [Cleaning up the starter](#1-cleaning-up-the-starter)                             | 🟢         |
| 2   | [App scaffold](#2-app-scaffold)                                                   | 🟢         |
| 3   | [Build and dependencies](#3-build-and-dependencies)                               | 🟡         |
| 4   | [Data layer configuration (JSON)](#4-data-layer-configuration-json)               | 🟡         |
| 5   | [Data sources](#5-data-sources)                                                   | 🟡         |
| 6   | [Categories in the TOC](#6-categories-subgroups-in-the-toc)                       | 🟢         |
| 7   | [FeatureInfo popup](#7-featureinfo-popup)                                         | 🟡         |
| 8   | [Charts and time filter](#8-charts-and-time-filter)                               | 🟡         |
| 9   | [TOC extension and transparency slider](#9-toc-extension-and-transparency-slider) | 🔴         |
| 10  | [Multilingual support](#10-multilingual-support)                                  | 🟡         |
| 11  | [Collapsible TOC panel](#11-collapsible-toc-panel)                                | 🔴         |
| 12  | [WMS legend](#12-wms-legend)                                                      | 🔴         |
| 13  | [Popup placement and marker](#13-popup-placement-and-marker)                      | 🟡         |
| 14  | [Testing](#14-testing)                                                            | 🟢         |
| 15  | [Open items](#15-open-items-and-ideas)                                            |            |
| 16  | [Branches and workflow](#16-branches-and-workflow)                                |            |
| 17  | [Custom WMS layers (temporary)](#17-custom-wms-layers-temporary)                  | 🔴         |
| 18  | [Geoportal Leverkusen (proxy)](#18-geoportal-leverkusen-proxy)                    | 🟡         |
| 19  | [Custom WFS layers](#19-custom-wfs-layers)                                        | 🟡         |

All commits on `dashboard` (2026-10-09, oldest first):

| Commit    | Content                                                  |
| --------- | -------------------------------------------------------- |
| `aa783cd` | Removed samples, sample package and sites                |
| `c81b2de` | Adjusted build configuration and CI                      |
| `a535bb3` | Dashboard app with map, TOC and collapsible bottom panel |
| `3268f05` | Docs: wiring                                             |
| `d9f88b3` | Data layers: schema, parser, loading at runtime          |
| `6a1d0da` | Create layers from the configuration (WMS, SensorThings) |
| `e1415f4` | Docs: data layer configuration                           |
| `4c237a1` | Categories (groups) in the configuration                 |
| `6268f50` | WMS GetFeatureInfo in the popup                          |
| `f71ec9a` | Chart with time filter in the bottom panel               |
| `3cff0ea` | License override for `pako` 2.2.0                        |
| `f0eefec` | Docs: categories, FeatureInfo, charts, time filter       |
| `cb6feb5` | Forked the TOC as local package `@cosite/toc`            |
| `58c94ff` | Transparency slider in the ⋮ menu (replaced later)       |
| `7acb8be` | Live language switch (de/en)                             |
| `8c3b040` | Docs: TOC fork, slider, i18n                             |
| `5c52ad7` | Transparency slider directly below the layer name        |
| `f37ab3c` | English as default, EN\|DE toggle instead of dropdown    |
| `3452a7a` | Docs updated                                             |
| `237a773` | TOC panel collapsible to the left                        |
| `abff501` | Docs: collapsible TOC panel                              |
| `8256091` | WMS legend in the FeatureInfo popup                      |
| `0cf7594` | Popup header (✕) stays visible while scrolling           |
| `7802450` | Docs: WMS legend                                         |
| `74b09ed` | Marker at the click position, popup next to it           |
| `2fc058c` | Docs: marker and popup placement                         |

Additionally on branch `toc-native` (branched off `dashboard`, variant without the TOC fork, see section 9):

| Commit                          | Content                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `22b279a`                       | Removed the TOC fork, integrated the original `@open-pioneer/toc` |
| `9dc52cb`                       | Transparency slider via the public TOC API                        |
| `f3cfda7`                       | Data sources: DWD radar (RADOLAN-RW), STA Datastream 15           |
| `0e89ebd`                       | Sensor list and selection for the analysis panel                  |
| `f6dfa00`                       | Tabs „Einzelsensor“ / „Sensorvergleich“ in the analysis panel     |
| `448bffa`                       | Popup with all sensors at the click position                      |
| `bfce880`                       | Time filter: „Gesamter Zeitraum“                                  |
| `20d9667`                       | Chart type selection, bar chart                                   |
| `0331716`                       | Box plot (`@sgratzl/chartjs-chart-boxplot`)                       |
| `d9e9148`                       | Wind rose (scaffold)                                              |
| `aac34f9`                       | Docs: chart types, entire period                                  |
| `77ef99f`                       | TOC: info icon instead of ⋮ (via CSS)                             |
| `dcc943e`                       | Analysis panel: larger tabs, time filter below                    |
| `80c4910`                       | Analysis panel collapses to an icon                               |
| `ed1f5ef`, `d0e4c24`, `c83ad6a` | Chart types as icons with tooltip                                 |
| `b938ba9`                       | Docs: design changes                                              |
| `d0e4c24`                       | Analysis panel: tabs `lg`, no heading                             |
| `c83ad6a`                       | Analysis panel: height 45 % of the app                            |

---

## 1. Cleaning up the starter

🟢 **What:** Remove everything that has nothing to do with the dashboard.

- **Decision:** Deleted `src/samples/` (map-sample, i18n-howto), `src/packages/sample-package/`, `src/apps/empty/` and
  `src/sites/`. Kept: `docs/**` as a knowledge base, `support/**`, `patches/**`, tooling configuration.
  The root page `src/index.html` hosts the dashboard directly (`pnpm dev` opens it right away).
- **Why:** The samples showed how to do things but were not part of the product. The docs remain useful as a
  reference.
- **Pitfalls:** Without packages under `src/packages/`, Typedoc has nothing to document, so the CI step
  `build-docs` was removed. With the TOC fork (section 9, branch `dashboard`) there was a package and the step again; on
  `toc-native` there is no local package any more and the step is removed again.
- **Commits:** `aa783cd`, `c81b2de`

## 2. App scaffold

🟢 **What:** New app `src/apps/dashboard` with an OSM map, TOC at the top left, zoom buttons and a collapsible panel at
the bottom.

- **Decision:** Structure follows the pattern of the removed map sample (`MapConfigProvider` as a service,
  `useMapModel` → `DefaultMapProvider` → `MapContainer`). The bottom panel uses Chakra `Collapsible`.
- **Pitfalls:** `SectionHeading` from `@open-pioneer/react-utils` throws an error if it is not inside a
  `TitledSection`. This only came up while reading the source code and is now taken into account in the panel and TOC.
- **Commits:** `a535bb3`

## 3. Build and dependencies

🟡 **What:** Problems with the package manager and CI that came up during the rebuild.

- **pnpm trust policy:** `pnpm install` aborted with "Missing time for version 1.3.1 of tinyexec". The registry has the
  timestamp, only the locally cached metadata did not. Fix: `pnpm cache delete tinyexec`. Nothing was changed in the
  security policies.
- **`resize-observer-polyfill`:** is needed in `src/testing/global-setup.ts` but only came in transitively via the
  map packages of the samples. After deleting them, the pre-commit `tsc` failed. With the map packages of the new app
  it is back. That is why the lockfile landed in a later commit back then.
- **`pako` license:** When the lockfile was rebuilt, `pako` went from 2.1.0 to 2.2.0. The license report (CI) only knew
  the exception for 2.1.0. License unchanged (MIT and Zlib), only the version in `support/license-config.yaml` adjusted.
- **Open:** `CHANGELOG.md` has a formatting error (`pnpm fmt:check`) that already exists on `main` and was deliberately
  left untouched.
- **New dependency:** `@sgratzl/chartjs-chart-boxplot` ^4.4.5 in the catalog (MIT, box plot, see section 8).
  License report and duplicate check found nothing.
- **Commits:** `c81b2de`, `a535bb3`, `3cff0ea`, `0331716`

## 4. Data layer configuration (JSON)

🟡 **What:** Data layers are not in the code but in `src/public/config/dataLayers.json`
(name, description, endpoint, type …).

- **Decision:** The file is loaded **at runtime** via `fetch`, not imported at build time.
- **Why:** The wish was to be able to change layers after deployment without rebuilding. No backend is needed for that:
  Vite copies `src/public` unchanged to `dist/www`, the web server serves the file statically, the browser parses
  it with `response.json()`. Via `VITE_DATA_LAYERS_URL` it can later also come from a bucket or an API
  (then the server must allow CORS).
- **Rejected:** Import at build time (type-checked, but every change needs a rebuild).
- **Robustness:** `parseDataLayers` checks every entry and skips invalid ones with a warning. If the file is missing or
  broken, the map starts with the basemap only. Both are tested.
- **Commits:** `d9f88b3`, `6a1d0da`, `e1415f4`

## 5. Data sources

🟡 **What:** A DWD service with 2 m temperature and the given SensorThings datastream.

- **DWD:** The chosen WMS layer is `Icon_reg025_fd_sl_T2M` („Lufttemperatur in 2m aus ICON“, air temperature at 2 m
  from ICON; forecast, hourly time dimension; without `TIME` the server returns the default time). `RBSN_T2m` (measured
  values at DWD stations) was also an option. User's decision: ICON. Drawback: the grid is coarse (0.25°).
- **SensorThings:** `https://cosite.thk.52north.org/sensordata/v1.1/Datastreams(14)` is **soil** temperature
  (SMT100, Köln-Kalk), not air temperature at 2 m. It is named accordingly. CORS is allowed.
- **Initial view:** Cologne instead of Münster, so that the sensor point and the temperature grid are visible right
  away.
- **Notable in the data:** On 06.10. there are two values of exactly `0` (12:34 and 12:37 UTC), probably sensor
  outliers. Deliberately not filtered, that would be a domain decision.
- **Added (demo):** DWD layer `RADOLAN-RW` („angeeichtes Radarkomposit“, gauge-adjusted radar composite; measured
  precipitation total of the last hour, Germany only; GetFeatureInfo returns `RW_HDF5` in mm and `TIME`). Chosen instead
  of the ICON forecast `Icon_reg025_fd_sl_TOTPREC`, which accumulates since the model start and is hard to interpret.
  Initially it started hidden so it would not cover the temperature. Since 20.10., on request, all layers are visible
  at startup (RADOLAN with 30 % transparency). Plus Datastream 15 (SMT100 soil moisture in %, same node and location as
  Datastream 14).
- **Added (2026-11-13):** Datastream 16 (SMT100 soil temperature, Thing "ESP32 Node Test", delivering since
  30.10.2026). A demo setup about 800 m west of the node in Kalk. It serves as a second station against which the
  comparison by observed property is developed.
- **Commits:** `6a1d0da`

## 6. Categories (subgroups) in the TOC

🟢 **What:** Group layers into categories in the JSON file and show them as groups in the TOC (currently „WMS“ and
„Sensoren (STA)“).

- **Decision:** An entry with `"type": "group"` has its own `layers` list and may be nested.
  It becomes a `GroupLayer`, collapsible in the TOC with `collapsibleGroups` (collapsed at startup, `initiallyCollapsed`) and switchable as a whole.
- **Why this way:** Categories use the same mechanism as layers (same fields, same parser) instead of a
  second structure alongside.
- **Good to know:** The order in the file is the drawing order: later entries are on top on the map and
  appear higher in the TOC. IDs must be unique across the whole file.
- **Commits:** `4c237a1`

## 7. FeatureInfo popup

🟡 **What:** A click on the map shows the values of the DWD layer at that location.

- **Decision:** `GetFeatureInfo` as GeoJSON (`INFO_FORMAT=application/json`). Which fields appear with which
  label and unit is defined per layer in `wms.featureInfo.fields`. Without it, all raw attributes are
  shown.
- **Why:** The DWD raw data is named e.g. `Temperature_height_level_above_ground` and has many decimal places.
  With a field configuration it reads „Lufttemperatur 2 m: 8,3 °C“ (air temperature 2 m: 8.3 °C).
- **Good to know:** Only layers that are actually visible are queried, i.e. including all parent groups.
  Timestamps are shown in local time.
- **Commits:** `6268f50`

## 8. Charts and time filter

🟡 **What:** A click on the sensor point loads the observations and draws them in the bottom panel. Time filter with
presets (24 hours, 7 days, 30 days) and a custom from/to range.

- **Decision:** Chart.js.
- **Why / rejected:** On the old branch `origin/test/charts`, recharts (via `@chakra-ui/charts`) was tested and
  had to be patched: recharts looks up elements via `document`, but Trails renders the app in the shadow DOM.
  Chart.js draws on a canvas and does not need that.
- **Details:**
    - Gaps in the data (e.g. approx. 17.09.–05.10.) stay gaps instead of a straight line that fakes observations.
    - The x-axis shows exactly the selected time range.
    - `degC` from the STA is displayed as `°C`.
    - At most 20,000 values, after that the note „gekürzt“ (truncated).
    - An invalid range (from ≥ to) is highlighted, the last valid one stays active.
- **Querying the observations** (`dataLayers/sta/sta.ts`): The time range query and the latest value query build their
  URL with the same helper (`observationsQueryUrl`) and load pages with `fetchObservationPage`. They differ only in
  direction, page size and time range.
    - **Sorting and filtering use `phenomenonTime`**, the time of the measurement. In the STA an observation has
      two times: `phenomenonTime` (when it was measured) and `resultTime` (when the result was produced). For
      measuring sensors these are practically the same, for forecasts they are not (validity time vs. model run). On our
      server `resultTime` is empty (`null`); sorting by it returns a random order (checked
      2026-10-21).
    - **Possible trap:** If another server or data provider puts the actual time only in `resultTime`, the chart
      and tiles show wrong values or none. Then `observationsQueryUrl` (filter and sorting) and
      `parseObservation` (which time ends up on the x-axis) need to be adjusted.
    - **Deliberately no `@iot.id` as a second sort key:** With it, FROST no longer pages via `$skip` but
      via `$skipFilter=(phenomenonTime gt <last time of the page>)`, even if the ID is in `$select` (checked
      2026-10-21). If two observations with the same time sit on a page boundary, the second one would be lost. Without
      the ID the server pages via `$skip`; for equal times the order is then undefined, but nothing is lost
      systematically.
    - **Only the direction (`asc`/`desc`) is configurable**, no free sorting: for a time series only the
      measurement time makes sense, min/max and statistics are computed by the app itself. If another STA query is
      added, the shared interface is reviewed again.
- **Limitation:** The native date fields format according to the browser language, not the app language.
- **Tabs (branch `toc-native`):** At the top of the panel „Einzelsensor“ (single sensor) and „Sensorvergleich“
  (sensor comparison).
    - Single sensor: dropdown with all STA sensors (including hidden ones), the chart below it.
    - Sensor comparison: two halves side by side (narrow: stacked), each with its own dropdown.
    - The time filter applies to both tabs so that the comparison shows the same time range.
    - Preselection: first sensor, or first and second sensor. Selection is by layer ID, the datastream data
      comes from the layer's feature (`dataLayers/sta/useStaSensors.ts`).
    - Dropdown as a native `<select>` (`NativeSelect`), so that no popup has to be positioned in the shadow DOM.
    - Only the active tab loads observations (`lazyMount`, `unmountOnExit`).
- **Sensor not available** (`createStaDatastreamLayer` in `dataLayers/sta/staLayer.ts`, `useSensorLoadFailed` in
  `dataLayers/sta/useStaSensors.ts`): Instead of an endless spinner, the panel shows „Sensor nicht verfügbar …“
  (sensor not available) in red. The TOC marks the layer like any other unavailable layer.
    - **Triggers:** Loading the datastream fails, takes longer than 30 s (`DATASTREAM_TIMEOUT_MS`), the
      datastream has no location, or the endpoint's `healthCheck` fails.
    - **Mechanics:** The layer's source goes through the states `loading` → `ready` or `error`.
      `@open-pioneer/map` derives `layer.loadState` from this (together with the health check). On
      `error` the TOC shows a red note on its own and disables the layer.
    - **Errors instead of only a timeout:** An error is known immediately. The timeout only catches requests that never
      respond. A timeout alone would wrongly show slow servers as errors.
    - **No location, no sensor** (user's decision, 2026-10-21): The dashboard is explored via the map, it is about
      _where_ a sensor is. A datastream without a location is therefore not shown without a
      map point but counts as unavailable. That way the configuration error gets noticed.
- **Assumptions of the STA hooks** (`dataLayers/sta/useStaSensors.ts`):
    - **One layer, one datastream:** The hooks read only the first feature of the source (`datastreamFeature`). If
      in the future e.g. a whole Thing with several datastreams is imported as _one_ layer, the dropdown, chart
      and tiles silently show only the first one. Then either create a separate layer per datastream
      (`createStaDatastreamLayer`) or adjust `datastreamFeature` and `useLoadedDatastreams` (which
      `useDatastreamProperties`, `useColocatedSensors` and `useStationColors` rely on).
    - **`useLoadedDatastreams` (and therefore `useDatastreamProperties`) looks up the sources only once per layer ID**, not reactively. Not a problem today,
      because the ID always comes from the list of existing layers (`useStaSensors`). If the hook is called with a fixed ID
      while the configuration is still loading, the result stays `undefined`. `useColocatedSensors` is
      reactive via `useStaSensors` and not affected.
- **Sensor popup:** A click on a sensor point no longer selects directly but shows a popup with **all**
  sensors at that location. Datastreams 14 and 15 are at the same place; before, only the one drawn last was
  reachable. The button „In Auswertung anzeigen“ (show in analysis) selects the sensor in the single view and opens the
  panel. The popup frame is shared with the FeatureInfo popup (`mapClick/PopupFrame.tsx`).
- **Chart types:** Line, bar, box plot, wind rose. Each view chooses its type itself, so in the comparison each
  half independently, because different observed properties can appear side by side there.
    - **Bar:** Mean per interval. The interval length depends on the time range: up to 2 days per hour, up to 45 days
      per day, beyond that per week (starting Monday, local time). Empty intervals stay empty. Whether precipitation
      will later need a sum instead of the mean is open.
    - **Box plot:** one box over all values of the selected time range (quartiles, median, whiskers 1.5 × IQR,
      outliers). Chart.js cannot do this itself, hence the plugin `@sgratzl/chartjs-chart-boxplot` (MIT, Chart.js 4
      plugin by the standard box plot author). Building it ourselves would have been approx. 100 more lines without
      tooltips.
    - **Wind rose (scaffold):** Frequency per direction in 16 sectors (north at the top center), Chart.js `polarArea`.
      Only data with an angle unit (`°`, `deg`) and values from 0–360 is used. Otherwise the rose stays empty with a
      note. There is no wind data yet.
- **Time filter „Gesamter Zeitraum“ (entire period):** queries from 1970 (i.e. everything) and draws the axis from the
  first observation. The "from" field stays empty. Currently approx. 3,800 values per datastream, far below the limit
  of 20,000.
- **Layout:** Tabs in size `lg`, the time filter below, both left-aligned. In the Chakra recipe `sm` and
  `md` have the same font (14px), only `lg` is larger (16px). The heading „Auswertung“ (analysis) was dropped, the
  collapse button sits to the right of the tabs, the area keeps its name as `aria-label`. Height: 45 % of the app
  (`45cqh`, the app root is `container-type: size`), at least 320px. So the reference is the app, not the
  browser window. The chart types are shown as
  icons (`LuChartLine`, `LuChartColumn`, `LuChartCandlestick`, `LuWind`). Lucide has no box plot icon, candlesticks come
  closest. The name appears as a tooltip and is the `aria-label`. The tooltip takes over the element ID of the
  segment (`ids`), because the segment group finds its items by ID.
- **Other sensors at the site (feedback, branch `feature/colocated_sensors`):** Next to the chart, the
  other sensors of the same site are shown as stacked tiles, in the single view and in each comparison half.
  A tile shows the layer name (localized, as in the dropdown), the **latest** value with unit and its
  time. A click switches the chart to that sensor. Deliberately no additional line in the chart.
    - **Grouping:** Not from the click list of the popup but from all STA layers. That way it also works when
      selecting via the dropdown, and the selection state remains a single layer ID.
    - **The default is the location**, not the Thing: it is not certain that every server models stations cleanly as
      Things. Same location means: the point coordinates (EPSG:4326 from the GeoJSON, `position` in
      `dataLayers/sta/sta.ts`) are at most `VITE_SENSOR_GROUPING_RADIUS` meters apart (default 1 m,
      great-circle distance with `getDistance` from `ol/sphere`). Other geometries are never grouped.
    - **Distance instead of rounded coordinates:** Previously the coordinate string rounded to 6 decimal places was
      compared. Sensors entered slightly offset were never grouped, and almost identical points fell apart at
      rounding edges (`7.6284004` → `…400`, `7.6284006` → `…401`). A distance is the same as a
      buffer around the point, no projection is needed. The grouping is relative to the selected sensor and is
      not transitive: if A–B and B–C are each 0.8 m apart, A shows only B, B shows A and C.
    - **Switchable** via `VITE_SENSOR_GROUPING` (`location`, `thing`, `location-or-thing`,
      `dataLayers/sta/colocation.ts`). For Datastreams 14 and 15 all three give the same result (same location, Thing 2).
    - **Open/risk (2026-10-30):** For now the grouping stays at a radius of 1 m. In reality the
      sensors of a station can be more than 1 m apart (they are then separated), and nearby sensors can belong to
      different stations (they are then merged); the STA model and practice can diverge.
      So far there is only one station with two sensors. If such cases occur, this will be decided again. Deferred:
      an explicit assignment of sensors to stations in `dataLayers.json`.
    - **Latest value:** separate query `$orderby=phenomenonTime desc&$top=1`, independent of the time filter. The
      "last value" in the line above the chart, on the other hand, is the last one in the time range.
    - **Many sensors:** The column is as tall as the chart and scrolls. Space for the scrollbar is reserved from the
      start (`scrollbar-gutter: stable`) so that the tiles do not get narrower when it appears. At the bottom
      a gradient fades in as long as more tiles follow (macOS only shows scrollbars while scrolling). A tile is
      approx. 78 px tall, at a window height of 950 px a good 3 are visible.
    - **Pitfall:** The timestamps of the STA server are approx. 2 h in the future (probably local time written with
      `Z`). The latest values therefore fall outside "until now", and the tile shows a later value and
      time than the chart.
- **Commits:** `f71ec9a`, `0e89ebd`, `f6dfa00`, `448bffa`, `bfce880`, `20d9667`, `0331716`, `d9e9148`, `dcc943e`,
  `ed1f5ef`; tiles: `8e7b250`, `ca2ea99`, `dd9d284`, `00c71ae`, `0c02156`, `3a1829e`

## 9. TOC extension and transparency slider

🔴 **What:** A transparency slider for every WMS layer, directly below the layer name in the TOC.

- **Problem:** `@open-pioneer/toc` offers no prop and no children for custom content per layer. The
  subcomponents (`LayerList`, `LayerItem`, `LayerItemMenu`) and the internal context are not exported
  (`package.json` only exposes `"."`), and nothing could be swapped out anyway.
- **Options considered:**
    1. Own TOC: full control, but all TOC features have to be rebuilt.
    2. Extend the original TOC via its public API (DOM element of the item + React portal).
    3. Slider area below the TOC: robust, but not next to the respective layer.
    4. Fork the TOC and add a slot.
    5. `pnpm patch` on the compiled package (mechanism exists in the repo, see [WaysToPatchAPackage.md](./WaysToPatchAPackage.md)).
    6. Propose a slot prop upstream as a pull request.
- **First solution (branch `dashboard`): fork.** `src/packages/toc` (`@cosite/toc`) from the upstream tag
  `@open-pioneer/toc@1.5.0` with a new prop. First as an interface in the ⋮ menu (`layerMenuContent`), where the
  slider was overlooked, then `layerItemContent(layer)` directly below the title.
  Commits: `cb6feb5`, `58c94ff`, `5c52ad7`.
- **Reassessment:** The fork copied ~20 files for ~50 changed lines and has to be reconciled by hand on every upstream
  update. Requirement after that: no fork, no patch, no PR, the existing component is to be extended.
  Option 2 had been overlooked when forking, because only props and subcomponents were checked, not the imperative API.
- **Current solution (branch `toc-native`): extension via the public API** (`toc/TocItemExtensions.tsx`):
    - `Toc` provides a `TocApi` in `onReady`. `api.getItems()` returns all items, each `TocItem` has
      `htmlElement`, the DOM element of the item. Both are documented and **reactive** (`reactive()` and
      `reactiveMap`), so re-rendering and removal of items are reported.
    - A separate `<div class="toc-layer-item-extra">` is appended as the last child of
      `<li class="toc-layer-item layer-<id>">`. The slider is rendered into it via `createPortal` and thus stays part
      of the app's React tree (Chakra, i18n, state).
    - Checked in the browser: exactly one slider, aligned with the title, works after group on/off, language switch,
      TOC panel open/closed and layer on/off.
- **Risks of the current solution:**
    - A foreign element in an area the TOC renders itself. React leaves unknown children alone, but it is
      not the intended purpose of `htmlElement` (the TOC docs say "e.g. for scrolling").
    - Content only at the end of the item: for WMS layers (sublayers hidden) directly below the title, for groups
      it would be below the children. If the TOC later adds new children to an item, they end up after the container.
    - If upstream changes the markup, the slider may sit differently. The API itself is public.
- **Info icon instead of ⋮:** The TOC's ⋮ button only opens the description, so it should look like ⓘ. The TOC renders
  the icon hard-coded, without a prop. That is why it is replaced via CSS (`toc/TocPanel.tsx`): the SVG in the button
  `.toc-layer-item-details-button` is hidden, and in its place a `::before` draws the Lucide icon "info"
  as a mask in the button's text color. The rule applies only inside the TOC, not to the ✕ in the popover (portal).
  Risk: According to the TOC README the class is not guaranteed. If it disappears, ⋮ shows up again, nothing breaks.
  Commit: `77ef99f`.
- **Detailed reasoning** for the team discussion: [TocExtensionDecision.md](./TocExtensionDecision.md).
- **Status:** Decided in favor of `toc-native` (extension via the public API, no fork). Merged into `main`.
  `dashboard` with the fork is kept as a reference but is no longer developed.
- **Commits (`toc-native`):** `22b279a`, `9dc52cb`

## 10. Multilingual support

🟡 **What:** UI and layer texts in English and German, switchable.

- **Decision:** Live switch without restart (`advanced.enableLiveLocaleChanges` in `app.ts`). Map extent,
  selection and time filter are kept when switching. In Trails' default mode the app would restart.
- **Texts in the JSON:** `name`, `description` and popup labels may be `{ "de": …, "en": … }`. If a
  language is missing, English is used, otherwise the first entry.
- **Technique:** The `MapConfigProvider` gets the `LocaleService` injected and creates the layers in the current
  language. On every switch `useLocalizedDataLayers()` sets the titles again. Popup and chart titles read the title
  live from the map.
- **History:** First a dropdown with the browser language as default. Changed on request to: **English as default**
  (`config.locale`), independent of the browser, and an **EN|DE toggle** (Chakra `SegmentGroup`) instead of a dropdown.
- **Limitation:** Data from the server (e.g. the STA name "SMT100 Soil Temperature") is not translated and is shown
  small next to the translated title.
- **Commits:** `7acb8be`, `f37ab3c`

## 11. Collapsible TOC panel

🔴 **What:** The layers box (TOC) slides out of view to the left, a small layers button remains to open it.

- **Pitfall 1:** The Trails `MapAnchor` has its own size and accepts clicks. A panel that was only moved
  left behind an invisible area in which map clicks did not arrive.
- **Pitfall 2:** The `MapAnchor` has `overflow: hidden`. With absolutely positioned content it shrank to zero,
  and the panel and button were clipped, i.e. invisible.
- **Decision:** The panel no longer sits in a `MapAnchor` but as a separate layer above the map. The frame
  has `pointer-events: none`, only the panel and button accept clicks. When collapsed the panel is `inert` (not
  reachable via Tab), and on toggling the focus jumps to whichever button is visible.
- **Analysis panel the same way:** When collapsed, the analysis panel at the bottom disappears completely; at the
  bottom left above the map a line chart button (`LuChartLine`) remains to open it. The map gets taller. Same focus
  handling as for the TOC.
- **Commits:** `237a773`, `80c4910`

## 12. WMS legend

🔴 **What:** The legend of the WMS layer in the FeatureInfo popup. Legends were the most laborious part.

- **Pitfall 1, upstream bug:** `@open-pioneer/map` 1.5.0 requests the capabilities with a hard-coded `LANGUAGE=ger`
  (`WMSLayer.js`). The DWD GeoServer responds to that with an error ("no international content defined"). The map
  silently ignores this: the layer counts as loaded, but there is no legend URL.
- **Solution:** If the URL from the capabilities is missing, the app builds a standard request
  `{endpoint}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER={name}`
  (`getLegendGraphicUrl` in `mapClick/legendUrls.ts`). For servers with working capabilities, their URL is used.
- **Pitfall 2, image format:** The default legend is 88×505 px portrait, the landscape variant 1544 px wide.
  Neither fits well into a popup.
- **Attempts:**
    1. Open the popup above or below depending on space: rejected, too much effort for the problem.
    2. Scale the image down in the browser (100 px, then 80 px height): first distorted (the width stayed), then
       proportional, but unreadable.
    3. **Have the server draw it small:** `LEGEND_OPTIONS=columns:4;fontSize:9` and `WIDTH/HEIGHT=12` produce
       242×77 px, sharp and readable. This is the current solution, configured per layer in `wms.legend.params`.
- **Risks with other layers** (deliberately left as is for now):
    - `GetLegendGraphic` is an extension, not a mandatory part of the WMS standard. GeoServer, MapServer, QGIS Server and
      ArcGIS support it, others may not. Then a broken image appears, load errors are not caught.
    - Only GeoServer understands `LEGEND_OPTIONS`. Other servers usually ignore the parameter, a very strict one could
      reject it. This only affects layers where it is set deliberately.
    - Configured parameters are set with `searchParams.set`. If a capabilities URL already contains `width=20`, the URL
      then additionally contains `WIDTH=12` instead of the value being replaced. Which one applies depends on the server.
    - The fallback URL always requests the default style. If a layer is integrated with a specific style, the
      legend can differ.
    - Very tall legends still fit thanks to the scrolling in the popup.
- **Commits:** `8256091`, `7802450`

## 13. Popup placement and marker

🟡 **What:** Where the FeatureInfo popup appears and how you can see where you clicked.

- **History:**
    1. Initially the popup opened above the click point. With the legend it got taller and stuck out at the top of
       the map.
    2. A header with ✕ that stays in place while scrolling was added on request (`0cf7594`).
    3. User's wish: marker at the click location, popup next to it, top edge below the click. If it does not fit
       below, it should stay visible between the analysis panel and the top edge.
- **Decision:** Blue pin via `map.highlights` (`mapClick/clickMarker.ts`). The popup sits to the right of the
  marker (at the right edge, to its left), with its top edge 8 px below the click. If there is not enough space
  downwards, it is pushed up just far enough to be fully visible (`mapClick/popupPlacement.ts`). Because the popup size
  changes while loading and when the legend loads later, the position is recalculated via `ResizeObserver` and when
  the map is resized.
- **Height and scrolling:** The popup is at most the map height minus 16 px, at most 400 px tall. Only when the content
  is taller does it scroll. With the compact DWD legend (content approx. 250 px) everything usually fits, and no
  scrollbar appears.
- **Selected sensor:** A click on a sensor point marks it with a blue ring, and the popup sits at the
  sensor instead of the click position. The next click on the map (or ✕ in the popup) removes the marking.
  „In Auswertung anzeigen“ (show in analysis) only closes the popup; the sensor stays marked as long as it is shown in
  the panel.
- **Commits:** `0cf7594`, `74b09ed`, `2fc058c`

## 14. Testing

🟢 **What:** How the changes were checked.

- **Vitest** (`pnpm vitest run`): configuration parser incl. groups, multilingual texts, FeatureInfo and
  legend options; time filter; gaps in the chart; legend URL; popup placement.
- **In the browser:** Every UI change was checked with headless Chromium against `pnpm preview`, driven via the Chrome
  DevTools Protocol (clicks, screenshots, network requests, console errors). The scripts are not in the repo.
- **CI-relevant:** `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm build-docs`, `pnpm build-license-report`.

## 15. Open items and ideas

- **Upstream issue:** Report the hard-coded `LANGUAGE=ger` in `@open-pioneer/map` (also: an endpoint URL with
  `?` results in a broken capabilities URL). Once it is fixed, the app automatically uses the legend URLs from the
  capabilities. For custom WMS the app already works around it (section 17).
- **Extend custom WMS:** FeatureInfo for services without GeoJSON (GML via `ol/format/WMSGetFeatureInfo`; HTML only
  sanitized), style selection (e.g. an accessible RADOLAN style), time dimension, zoom to the layer's extent.
- **More charts:** Line, bar, box plot and wind rose exist (section 8). More as needed.
- **CI deploy:** The `deploy` job in `.github/workflows/test-and-build.yml` is still bound to the repository
  `open-pioneer/trails-starter` (`github.repository == …`) and therefore never runs in `Co-Site/cosite-dashboard`
  either. Build and tests run there on every push. Whether a deploy to GitHub Pages is wanted is open.
- **Data:** Clarify the handling of sensor outliers (e.g. `0` values) from a domain point of view. STA server timestamps
  are approx. 2 h in the future (see section 8, tiles), clarify with the operator. For further STA servers check whether
  the measurement time is in `phenomenonTime` and not only in `resultTime` (section 8, Querying the observations).
- **Overlapping sensor points:** Sensors at the same location are one point on the map. The popup lists them, in the
  panel they appear as tiles next to the chart. A representation on the map (e.g. clustering or offset) is still
  pending.
- **Whole Thing as a layer:** It is quite possible that a Thing with all its datastreams will be imported at some
  point. Then keep the assumption "one layer, one datastream" in mind (section 8, Assumptions of the STA hooks).
- **Clarify the wind rose from a domain point of view:** Which datastreams (direction, speed), speed classes stacked per
  sector, number of sectors. For stacked classes `polarArea` is not enough, then a custom drawing or a plugin.
- **Bars for precipitation:** Sum instead of mean per interval, possibly per datastream in the configuration.

## 16. Branches and workflow

**What:** How development works since `toc-native` was merged into `main`.

| Branch       | Role                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `main`       | Stable state. Only receives merges from `dev`.                       |
| `dev`        | Integration state. Receives merges from feature branches.            |
| `<feature>`  | One branch per feature, branched off `dev`, e.g. `feature/windrose`. |
| `toc-native` | Chosen TOC variant, merged into `main`. Kept as history.             |
| `dashboard`  | TOC fork variant. Not merged, kept only as a reference.              |

- **Flow:** Feature branch from `dev` → one commit per step → `git merge --no-ff <feature>` into `dev` → when
  `dev` is stable, `git merge --no-ff dev` into `main`. `--no-ff` so that every feature stays visible as a merge
  commit. Afterwards bring `dev` up to `main` with `git merge --ff-only main` so that both are on the same commit
  (otherwise the merge commit only exists on `main`).
- **Catching up:** Rebasing a feature branch onto the current `dev` before the merge is fine (it is not
  shared yet). If something lands directly on `main` (hotfix), `main` is **merged** into `dev`, not rebased: a rebase
  would rewrite the commits of `dev` and then no longer match the feature branches already merged.
- **Remotes:**
    - `origin` = `git@github.com:Co-Site/cosite-dashboard.git`, our own repo. `main` and `dev` are pushed
      there, feature branches only when needed.
    - `upstream` = `open-pioneer/trails-starter`, fetch only. Push is disabled (`git remote set-url --push
upstream no-push`). Fetch updates from the starter when needed with `git fetch upstream` and merge them in a
      feature branch.
    - `toc-native` and `dashboard` exist only locally.

## 17. Custom WMS layers (temporary)

🔴 **What:** Customer request: add WMS layers for the current session without saving anything, with as few
inputs as possible (at most a title, not several text fields).

- **Decision:** A form below the TOC title with two fields: the service URL, then a search field with
  suggestions for the layer. The title comes from the capabilities, it is never typed.
- **Why a search field instead of a layer name field:** Hardly anyone knows technical names like
  `Icon_reg025_fd_sl_T2M`. The capabilities have to be loaded anyway (title, FeatureInfo format, error messages), the
  search is just the UI on top. Experts type the exact name and press Enter.
- **List instead of search only (follow-up):** At first the list showed only search hits (at most 30). User's
  wish: be able to browse without a search term too. Now, without input, all layers are shown in document order in
  a scrollable list (`min(22rem, 40vh)` tall), the search only filters them. No tree: DWD has 206 layers (approx.
  1 MB of capabilities), the path (parent titles) is shown small below each entry. Named group layers (e.g.
  „Fachlayer“) are included, when added they show all their sublayers.
- **What the capabilities provide** (checked against DWD, BKG TopPlusOpen, NRW DOP, BGR BÜK200, BfN, LANUV):
    - Yes: layer list, title, `queryable`, GetFeatureInfo formats, legend URL, CRS, time dimension, extent.
    - Partly: abstract (often empty or the same as the title), provider, terms of use.
    - No: English texts (no service is multilingual, DWD responds to any `LANGUAGE` with an error), usable
      attribution (not present in any service, only long free text in `Fees`/`AccessConstraints`), field labels
      (only raw names like `RW_HDF5`), reliable units.
    - Consequence for the configuration: `name` is optional for WMS (title from the capabilities), `featureInfo.format`
      is new. Curated texts in German and English, attribution, field labels and legend parameters remain manual.
- **Where the layers end up:** The existing group „WMS“ was requested. That does not work: groups in
  `@open-pioneer/map` 1.5.0 have a fixed children array (`GroupLayerCollection`), and a layer only leaves a
  group when the group is destroyed (along with its children). Rebuilding the WMS group would have reset the state of the
  configured layers. Instead there is a separate group „Eigene WMS“ (custom WMS) directly below it, which is rebuilt on
  every change; visibility and opacity of the custom layers are carried over, and they briefly reload in the process.
- **FeatureInfo:** Until now `INFO_FORMAT=application/json` was hard-coded. Only GeoServer supports that; ArcGIS and
  MapServer return `application/geo+json`, some services no JSON at all (4 of 5 tested third-party services would have
  failed). Now the format is chosen from the capabilities; without a suitable format the layer is not
  queried (instead of „Anfrage fehlgeschlagen“ (request failed) on every click).
- **Attribution:** Without its own attribution, `@open-pioneer/map` uses `AccessConstraints` or `Fees` as the
  source credit (DWD: a bare URL, BfN: „Nicht für Planungszwecke geeignet“, not suitable for planning purposes). The
  app now always sets it itself (empty if not configured). Provider and terms of use of custom layers are in the layer
  description.
- **Pitfalls:**
    - `ol/format/WMSCapabilities` inherits CRS only across one level (the intermediate level is only filled in after
      its children). At DWD the CRS are only at the root, and the layers are three levels deeper. The app therefore
      inherits the CRS itself.
    - The XML parser of happy-dom (tests) stops the DWD document after 74 layers, in the browser all 206 are there.
      The unit tests use a small sample document.
    - The legend URL from the capabilities is only used for custom layers: at DWD it already contains
      `width=20&height=20`, and the configured legend parameters (`WIDTH=12`) were added on top. Parameters are
      now replaced case-insensitively, and legend images with a load error are hidden (BGR returns a
      legend URL with `%26` instead of `&`).
    - Services without CORS cannot be added (error message in the form, no proxy).
    - **Named DWD groups cannot be requested:** 16 folder groups (Fachlayer, Wetter, Radar, Satellit, Warnungen,
      Klima, Basislayer, …) have a `<Name>` in the capabilities, but GetMap responds with HTTP 200 and
      `ServiceException code="LayerNotDefined"` (also with the `dwd:` prefix and via `/geoserver/wms`). According to
      WMS 1.3.0 §7.2.4.6.3 a layer has a name if and only if it can be requested; so this is a bug at DWD
      (probably the configuration of the layer groups in GeoServer). The result in the app was an empty layer and only
      "Image load error" in the console.
    - **Feedback to the user** (because of this, and for services that are down):
        - Before adding, the app requests a 1 × 1 pixel image (`probeWmsLayer`). Only an image response counts;
          otherwise the service's message appears in the form and nothing is added. Groups are marked in the
          list.
        - In the TOC every WMS layer (configured ones too) shows a note as long as its map image does not load
          (`toc/LayerLoadWarning.tsx`, events `imageloaderror`/`imageloadend` of the OpenLayers source). The
          layer's `loadState` does not help, `@open-pioneer/map` only sets it on initialization errors.
        - Pitfall: On HTTP errors (e.g. 500), `@open-pioneer/map` only logs and leaves the image unfinished,
          and OpenLayers then reports nothing. The app wraps the source's load function and lets such an image
          fail (`reportFailedImageRequests` in `ows/wmsLayer.ts`).
- **Open:** see section 15 (GML FeatureInfo, styles, time dimension, zoom to the layer).
- **Commits:** `fd05554`, `2b15b8b`, `ac864aa`, `ba0a99a`, `d5ca6bb`; feedback: `20f6df2`, `ba62eac`

## 18. Geoportal Leverkusen (proxy)

🟡 **What:** Customer request: the most important layers from the Geoportal Leverkusen (topic „Natur, Umwelt und
Mobilität“, nature, environment and mobility) visible by default: urban climate projections, flooding, heavy rain,
groundwater use ban.

- **Service:** `https://geoportal.leverkusen.de/GCGisService` (GC OSIRIS on GeoServer, WMS 1.1.1/1.3.0, public,
  EPSG:3857, GetFeatureInfo as `application/json`). Found via the network requests of the geoportal; the
  topic links on leverkusen.de/service/geoportal contain the layer names.
- **Name matching** (capabilities of 2026-10-26):
    - Urban climate: `LEV:Heisse_Tage_…`, `LEV:Sommertage_…`, `LEV:Tropennaechte_…` each for `1971_bis_2000`,
      `2031_bis_2060`, `2071_bis_2100`. All three periods included, one entry per indicator with three sublayers.
    - Flooding: `LEV:hw_<gewässer>_<ueg|gg>_hq_<10|100|extrem>` (`ueg` flood area, `gg` protected
      area, `hq_10` = „HQ häufig“, frequent flood). One entry per water body (Dhünn, Mutzbach, Rhein, Wiembach) with all
      available combinations. The Wupper exists too; it was not on the customer's list and is deliberately missing.
    - Heavy rain: `LEV:Starkregen_T50`, `LEV:Starkregen_T100`, `LEV:Starkregen_hN90mm` (block rain 90 mm, the „sehr
      seltene Ereignis“, very rare event).
    - Groundwater: `LEV:Grundwassernutzungsverbot GL` (this is the one the geoportal uses).
- **No CORS:** The service sends no `Access-Control-Allow-Origin` (DWD sends `*`). `@open-pioneer/map` loads
  images and capabilities via `fetch`, so the layers stayed empty, locally as well as in production.
- **Decision: proxy on our own server.** Rejected:
    - Load images via `<img>`: would work without CORS, but without capabilities, FeatureInfo and legend (the legend is
      only in the FeatureInfo popup), sublayers only with technical names, canvas "tainted".
    - Ask the city for CORS: correct, but timing unknown. If the city sets the header, the proxy can be dropped
      (endpoint absolute again).
- **Implementation:** Relative endpoints are resolved against the app URL, Vite forwards `/proxy/leverkusen/`,
  in production nginx needs the same path (example in `DashboardWiring.md`). Several layers per entry (one GetMap
  instead of 31), the sublayer titles come from the capabilities.
- **Pitfalls:**
    - GetLegendGraphic of the urban climate layers responds with a `NullPointerException`; the `*_dummy` layers that the
      geoportal uses for this return empty images. Legend for urban climate therefore off.
    - The three periods of an indicator each cover the whole city. If all are visible, you only see the
      topmost one (2071–2100). Still open.
- **Commits:** `a32bf8e`, `2e4777f`, `2bf530b`, `1d735c6`

## 19. Custom WFS layers

🟡 **What:** As with WMS (section 17), it should be possible to add WFS services for the session and to enter them
permanently in `dataLayers.json` (`TODO.md`, discussed on 2026-10-30).

- **Decision:** A separate row „WFS hinzufügen“ (add WFS) below „WMS hinzufügen“ (add WMS) with the same flow (load URL,
  search feature type, add). WFS 2.0.0 and 1.1.0, GeoJSON and GML (3.2, 3.1, 2) right from the start. Group „Eigene WFS“
  (custom WFS, `user-wfs`) above the topmost layer with WMS, i.e. above the map images and below the sensors. One color
  per layer from a fixed palette (`dataLayers/ows/wfsStyle.ts`), no style picker. On a map click the attributes appear
  in the existing popup before the WMS results, and the feature is highlighted. No general proxy.
- **Shared with WMS instead of copied:** Session group (`dataLayers/userLayers.ts`), loading the capabilities
  (`toc/useServiceCapabilities.ts`), search (`toc/LayerSearch.tsx`) and form
  (`toc/AddServiceLayer.tsx`) are generic. What differs per service type is described by `toc/userServices.ts`
  (capabilities, entries, check, config). URL normalization, the "not reachable" error, session cache,
  exception messages and the description of custom layers are in `dataLayers/ows/owsService.ts`. Texts: shared ones under `addService.*`, type-specific ones under `addWms.*` and
  `addWfs.*`. The title from the capabilities (`applyCapabilitiesTitle`) and `FeatureInfoConfig` apply to both.
- **Capabilities:** OpenLayers has no parser for WFS capabilities (`ol/format/WFS` only reads GetFeature responses).
  Own parser in `dataLayers/ows/wfsCapabilities.ts` that reads elements by local name only, because the
  prefixes differ per server. Output formats are listed per feature type (deegree) or only on `GetFeature` in
  `OperationsMetadata` (GeoServer). The request uses `ACCEPTVERSIONS=2.0.0,1.1.0`, and the service responds with the
  newest version it supports (Hamburg, DWD and NRW respond with 2.0.0).
- **CRS (deviation from the plan):** The plan was EPSG:3857, then 4326, then 25832/25833. Now only
  projected systems are chosen: 3857, 25832, 25833. If a feature type lists none of them, 3857 is requested anyway.
    - Why: With EPSG:4326 the axis order (lat/lon or lon/lat) depends on the server, version and notation.
      A mistake puts the features in the wrong place without any message. Projected systems are always easting/northing.
    - DWD lists only EPSG:4258 but delivers 3857 on request. Services that cannot do this are caught by the check
      before adding.
- **Loading:** `bbox` strategy (only the map extent), at most `maxFeatures` (default 1000) per request. If
  a request returns exactly that many features, the TOC shows „Nicht alle Features geladen“ (not all features loaded).
  An exception report with HTTP 200 counts as an error, and the TOC then warns as for WMS (`featuresloaderror`,
  `toc/LayerLoadWarning.tsx`).
- **Check before adding:** GetFeature with one feature in the chosen format and CRS (`probeWfsFeatureType`).
  Only a FeatureCollection counts. Feature types without GeoJSON and GML output are rejected with a message.
- **Pitfalls:**
    - deegree (Hamburg) omits `features` from the GeoJSON for an empty result (`{"type":"FeatureCollection"}`), which
      makes `ol/format/GeoJSON` fail. The app reads the JSON itself first.
    - After an error, `removeLoadedExtent` made the extent reload immediately: a request loop. A
      failed extent now counts as loaded and is only requested again for a new extent.
    - happy-dom (tests) does not know `lookupNamespaceURI` nor an XML declaration with single quotes. The
      namespace of the feature type (for GML) is therefore looked up via the `xmlns:` attributes by the app itself.
- **Checked in the browser:** Hamburg administrative boundaries (deegree; 2.0 with GeoJSON and 1.1 with GML 3.1.1
  congruent), DWD GeoServer (61 feature types, adding and removing, upper limit), Leverkusen directly (without CORS:
  error message), a wrong feature type (load warning). „WMS hinzufügen“ (add WMS) unchanged after the rework.
- **Cleanup before the merge** (grilling on 2026-10-30, yardstick: simple where it can be simple, precise for CRS/axes,
  format detection and config validation):
    - Folders: `dataLayers/config/` (schema, loading, texts), `ows/` (WMS, WFS), `sta/` (SensorThings). Creation
      per type lives in the folder (`ows/wmsLayer.ts`, `ows/wfsLayer.ts`, `sta/staLayer.ts`), `createDataLayer.ts` only
      dispatches. What all of them share is in `dataLayerBase.ts`, otherwise there would be import cycles between the
      folders. `userLayers.ts` stays at the top level as a general building block (can later take other service types
      too).
    - Simplified: session groups without generics (one class, two `switch`es), GetFeature from a settings object
      (`resolveWfsRequest` returns `undefined` instead of throwing), checks only return the service's message, only
      "not reachable" remains as its own error class, one request with `ACCEPTVERSIONS` instead of one per version,
      one hook for the load warning, unused fields and exports and trivial tests removed.
    - Deliberately kept: `wfs.version` and `wfs.outputFormat` in the config (principle: config before service), style
      per geometry type and color from the layer ID.
- **Open:** Paging instead of a fixed upper limit, style picker, legend. No permanent WFS layer has been entered in
  `dataLayers.json` yet.
- **Commits:** `96b332d`, `e83aab9`, `9e60605`, `abad3d4`, `cd69e8e`, `c532ca8`, `c3a701b`, `ca342b2`; docs: `3113d55`; cleanup: `5996bac`, `8591894`, `4040c3c`, `3da326f`, `27cd718`, `387c7c3`,
  `5f30255`, `971d8d2`, `e9b51ed`, `e4cdc46`, `f882a36`

## 20. Observed property comparison

🟡 **What:** A third tab in the analysis panel compares all sensors of one observed property in one chart
(`TODO.md`, grilling on 2026-11-13). It is based on the key `observedProperty` on the sensor (see Overview).

- **Selection:** Only observed properties carried by at least two configured sensors can be chosen, in the order
  of the configuration; the first one is preselected. Layers hidden in the TOC count too. If there is no such
  observed property, the tab stays visible and shows a note.
- **Name of the observed property:** Translation from the app's i18n files (`observedProperty.<key>`), otherwise the
  raw key. So a new observed property needs an entry in `i18n/de.yaml` and `en.yaml` (and a rebuild) for a nice name.
  Rejected: a name field in `dataLayers.json`.
- **Series:** One line per sensor, labeled with the layer name from the configuration (provisional). Axis and
  tooltip use the unit of the first sensor; nothing is checked (principle "the configuration is
  responsible", so far there is only °C).
- **Tiles instead of a legend:** As in the single tab, the sensors appear as tiles with the latest value next to the
  chart, and the border has the color of the line. A click hides or shows the series; initially all are on. The
  hidden sensors are remembered so that new ones appear on their own; the selection survives switching tabs.
- **Loading:** Each sensor loads individually and in parallel (max. 20,000 values per sensor). An error only affects
  its tile („nicht verfügbar“, not available). Hidden sensors are loaded too, so that showing them takes effect
  immediately.
- **Left out:** the line with count, min, max and last value; the note about truncated data with more
  than 20,000 values.
- **Simplified (2026-11-13, yardstick: simplicity):** Observed properties as a `Record` (key → sensors) instead of a
  dedicated type, observations per sensor as a list or `"error"` instead of a state union, no check "selected observed
  property still exists" (the configuration does not change at runtime). One line chart (`SeriesChart`) for all tabs;
  its tooltip always names the series, also in the single tab. If series are loaded but have no values in the time
  range, the chart stays empty (no text of its own). With „Gesamter Zeitraum“ (entire period) the axis starts at the
  first value of the visible series. Deliberately kept: the shape check of `observedProperty` and `unit` and the tile
  „nicht verfügbar“ (not available).
- **Line only:** Bars and box plots for several series come later (`TODO.md`), the wind rose is dropped in the
  comparison.
- **Colors:** Lines and tile borders have the color of the sensor's station (section 21).
- **Checked in the browser:** Datastreams 14 and 16 as two lines, tooltip, hiding via the tile, switching tabs,
  switching language.

## 21. Station colors

🟡 **What:** Every station has a color that runs through the whole app (grilling on 2026-11-13). That way you can
see in the TOC, on the map and in the charts which sensors belong together.

- **Station:** Sensors at the same site according to the existing grouping (`VITE_SENSOR_GROUPING`, radius 1 m).
  A sensor without neighbors is a station with one sensor and also gets its own color; otherwise
  two single sensors could not be told apart in the comparison.
- **Assignment:** In the order of the configuration, from a fixed palette of 20 colors (there will not be many
  stations); after that they repeat. The color is not in `dataLayers.json`.
- **Where:** Sensor point on the map (previously all orange), dot in front of the sensor in the TOC, tile borders,
  lines, bars, boxes and wind rose in all three tabs (previously a fixed blue).
- **Palette:** The first eight colors are the previous chart palette. Checked with the validator of the
  dataviz skill: neighboring colors in the list stay distinguishable even with color vision deficiency, colors far
  apart in the list can look similar. With 20 colors it cannot be done better.
- **Deliberately not handled:** Chains (A–B and B–C close, A–C not): a sensor joins the first station whose
  first sensor is at the same site. Two sensors of the same station with the same observed property would have the
  same line color in the comparison. According to the user, neither occurs.
- **Quirk:** The station follows from the location, and the app only knows that once the datastream is loaded.
  So the colors appear together with the sensors; if an earlier sensor loads later than a later one, a
  color can change once at startup. A sensor that does not load has no color.
- **TOC dot:** The TOC only allows content below the title row (`TocItemExtensions`). The dot is pulled into the row
  with negative margins, into the free space of the expand arrow. With multi-line titles it therefore sits
  slightly below the middle of the row.
- **Checked in the browser:** Datastreams 14 and 15 (Köln-Kalk) blue, Datastream 16 (demo node) orange, in each case on
  the map, in the TOC, on the tiles and in the line charts of all three tabs.
