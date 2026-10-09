# Dashboard: Wie das Projekt verdrahtet ist

Kurzreferenz, wie Workspace, Vite, Apps, Services und Pakete zusammenhängen.
Die ursprünglichen Beispiele des Trails Starters (`src/samples/*`, `src/packages/sample-package`,
`src/apps/empty`, `src/sites/empty`) wurden entfernt; sie sind auf dem Branch `main` weiterhin vorhanden.

## pnpm-Workspace

- `pnpm-workspace.yaml` → `packages: src/**`: jedes Verzeichnis unter `src/` mit einer `package.json` ist ein Workspace-Paket.
- Versionen werden zentral im `catalog:` gepflegt; in den `package.json`-Dateien steht nur `"<paket>": "catalog:"`.
  Die Trails-OpenLayers-Pakete teilen sich eine Version über den YAML-Anker `&ol_base_packages_version`,
  die Core-Pakete über `&core_packages_version`.
- Neues Trails-Paket hinzufügen: Eintrag im Catalog ergänzen, dann in der App-`package.json` mit `catalog:` referenzieren, `pnpm install`.

## Vite

- `vite.config.ts`: `root: src`, Build-Ausgabe nach `dist/www`.
- Plugin `pioneer({ rootSite, sites, apps })`:
    - `rootSite: true` → `src/index.html` wird gebaut. Diese Seite hostet aktuell direkt die Dashboard-App.
    - `sites: [...]` → weitere Ordner mit eigener `index.html` (z. B. `"sites/foo"`).
    - `apps: [...]` → Apps, die zusätzlich als eigenständige `.js`-Dateien (Embedding) ausgeliefert werden.
- Eine Site lädt eine App per `<script type="module" src="./apps/<app>/app.ts">` und enthält das Custom Element (z. B. `<dashboard-app>`).

## App-Aufbau (`src/apps/dashboard`)

| Datei              | Zweck                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `package.json`     | Paketname + Abhängigkeiten (alle über `catalog:`)                                                         |
| `build.config.mjs` | `defineBuildConfig({ i18n, styles, services, ui })` – Sprachen, CSS, Service-Registrierung, UI-Referenzen |
| `app.ts`           | `createCustomElement({ component, appMetadata })` + `customElements.define("dashboard-app", ...)`         |
| `services.ts`      | Service-Klassen, z. B. `MainMapProvider` (Kartenkonfiguration)                                            |
| `DashboardApp.tsx` | Root-Komponente: Karte, TOC, Kartenwerkzeuge, Bottom-Panel                                                |
| `BottomPanel.tsx`  | Einklappbares Panel unten (Chakra `Collapsible`), später für Diagramme                                    |
| `i18n/*.yaml`      | Übersetzungen, Zugriff über `useIntl().formatMessage({ id })`                                             |
| `dataLayers/`      | Datenlayer: JSON-Schema + Parser (`types.ts`), Loader, Layer-Fabrik, SensorThings-Helfer (`sta.ts`)       |
| `mapClick/`        | Kartenklick: Sensorpunkt auswählen oder WMS-GetFeatureInfo im Popup                                       |
| `charts/`          | Zeitfilter, Laden der Messwerte und Liniendiagramm (Chart.js)                                             |
| `toc/`             | Ergänzungen zum TOC: Transparenz-Slider, Sprachumschalter (EN/DE), Übersetzung der Layernamen             |

## Datenlayer (`src/public/config/dataLayers.json`)

Die Datenlayer der Karte sind nicht im Code festgelegt, sondern stehen in einer JSON-Datei, die die App **zur Laufzeit** lädt.

- Die Datei liegt in `src/public/` (Vites `publicDir`) und wird beim Build unverändert nach `dist/www/config/dataLayers.json` kopiert.
  Nach dem Deployment lässt sie sich auf dem Webserver ändern, ohne neu zu bauen.
- Kein Backend: Der Browser lädt sie per `fetch` und parst sie mit `response.json()` (`dataLayers/loadDataLayers.ts`).
- Andere Quelle (Bucket, API …): `VITE_DATA_LAYERS_URL` setzen, z. B. in `.env.local`. Der Server muss dann CORS erlauben.
- Ist die Datei nicht erreichbar oder ungültig, startet die Karte nur mit der Basemap. Der Fehler steht in der Browser-Konsole.
  Einzelne ungültige Einträge werden mit Warnung übersprungen.

### Aufbau: Kategorien und Layer

`layers` ist eine Liste aus Layern und Kategorien. Eine Kategorie (`"type": "group"`) hat selbst wieder
eine `layers`-Liste und kann beliebig verschachtelt werden. Kategorien erscheinen im TOC als einklappbare Gruppen
und lassen sich als Ganzes ein- und ausschalten. Aktuell gibt es die Kategorien „WMS“ und „Sensoren (STA)“.

Die Reihenfolge in der Datei ist die Zeichenreihenfolge: Spätere Einträge liegen auf der Karte oben
und stehen im TOC weiter oben.

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

### Felder

| Feld                      | Pflicht     | Bedeutung                                                               |
| ------------------------- | ----------- | ----------------------------------------------------------------------- |
| `id`                      | ja          | Eindeutige ID (über die ganze Datei), auch Layer-ID in der Karte        |
| `type`                    | ja          | `group`, `wms` oder `sta-datastream`                                    |
| `name`                    | ja          | Anzeigename im TOC (Text oder pro Sprache, s. u.)                       |
| `description`             | nein        | Beschreibung im ⋮-Menü des Layers (Text oder pro Sprache)               |
| `visible`                 | nein        | Initial sichtbar (Default `true`)                                       |
| `opacity`                 | nein        | Deckkraft 0–1 (Default `1`)                                             |
| `layers`                  | bei `group` | Enthaltene Layer und Kategorien                                         |
| `endpoint`                | bei Layern  | URL des Dienstes (WMS-Basis-URL bzw. URL des SensorThings-Datastreams)  |
| `attribution`             | nein        | Quellenangabe auf der Karte                                             |
| `wms.layers`              | bei `wms`   | Liste der WMS-Layernamen aus den Capabilities                           |
| `wms.featureInfo.enabled` | nein        | GetFeatureInfo beim Kartenklick (Default `true`)                        |
| `wms.featureInfo.fields`  | nein        | Anzuzeigende Attribute `{ property, label?, unit? }`; ohne Angabe: alle |

Beispiel WMS-Layer:

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

### Mehrsprachige Texte

`name`, `description` und `wms.featureInfo.fields[].label` sind entweder ein einfacher Text (gilt für alle Sprachen)
oder ein Objekt mit einem Text pro Sprache:

```json
"name": { "de": "Lufttemperatur 2 m (DWD ICON)", "en": "Air temperature 2 m (DWD ICON)" }
```

Fehlt die aktuelle Sprache, wird Englisch genommen, sonst der erste Eintrag (`dataLayers/localizedText.ts`).

### Layertypen

- **`group`** → `GroupLayer` aus `@open-pioneer/map`, Kinder werden rekursiv erzeugt.
- **`wms`** → `WMSLayer` aus `@open-pioneer/map`. Bei genau einem WMS-Layer wird der Sublayer im TOC ausgeblendet.
- **`sta-datastream`** → Punktlayer (`SimpleLayer` + OL-`VectorLayer`) an der Location des Things.
  Das Feature trägt u. a. `observationsUrl`, `unit` und `name` (siehe `StaDatastreamProperties` in `dataLayers/sta.ts`).
  `healthCheck` auf den Endpunkt markiert den Layer im TOC als nicht verfügbar, wenn der Dienst nicht antwortet.

Jeder erzeugte Layer hat die Original-Konfiguration im Attribut `dataLayer` (`layer.attributes.dataLayer`).
Darüber findet der Kartenklick z. B. die `featureInfo`-Einstellungen eines WMS-Layers.

### Neuen Layertyp hinzufügen

1. In `dataLayers/types.ts` ein neues Interface mit eigenem `type` anlegen, in die Union `DataLayerConfig` aufnehmen
   und in `validateEntry` die typspezifischen Felder prüfen.
2. In `dataLayers/createDataLayer.ts` einen `case` für den neuen Typ ergänzen. TypeScript meldet fehlende Fälle.
3. Test in `dataLayers/types.test.ts` erweitern und den Typ hier in der Doku eintragen.

## Kartenklick, Popup und Diagramme

`mapClick/useMapClick.tsx` hört auf Klicks in die Karte:

1. **Sensorpunkt getroffen** (5 px Toleranz, Mauszeiger wird zur Hand): Der Datastream wird ausgewählt und das
   Bottom-Panel geöffnet. Der Zustand (`datastream`, `timeFilter`, `panelOpen`) liegt in `DashboardApp.tsx`.
2. **Sonst**: Alle sichtbaren WMS-Layer mit aktiver FeatureInfo werden per `GetFeatureInfo` (GeoJSON) abgefragt
   (`mapClick/featureInfo.ts`). Das Ergebnis erscheint als Popup (`map.overlays`) an der Klickposition.
   Zahlen werden lokalisiert, ISO-Zeitstempel in Ortszeit angezeigt.

Im Bottom-Panel:

- **Zeitfilter** (`charts/TimeRangeFilter.tsx`): Presets 24 Stunden, 7 Tage (Default), 30 Tage oder eigener Zeitraum von/bis.
  Ungültige Eingaben (von ≥ bis) werden markiert, der letzte gültige Zeitraum bleibt aktiv.
- **Diagramm** (`charts/DatastreamChart.tsx`, `charts/ObservationChart.tsx`): lädt die Messwerte des Datastreams im
  Zeitraum (`fetchObservations` in `dataLayers/sta.ts`, folgt `@iot.nextLink`, max. 20.000 Werte) und zeigt sie als
  Liniendiagramm mit Tooltip und Fadenkreuz. Lücken in den Daten bleiben als Lücke sichtbar. Darüber stehen
  Anzahl, Min, Max und letzter Wert.
- **Chart.js statt recharts**: Trails rendert die App im Shadow DOM. recharts sucht Portale über `document`
  und musste dafür gepatcht werden (siehe alter Branch `origin/test/charts`). Chart.js zeichnet auf Canvas und braucht das nicht.
- Einheiten aus der STA werden für die Anzeige übersetzt (`degC` → `°C`, siehe `displayUnit` in `dataLayers/sta.ts`).

## TOC (`@cosite/toc`, Fork)

Der TOC ist ein Fork von `@open-pioneer/toc` 1.5.0 unter `src/packages/toc` (Apache-2.0, Quelle: Upstream-Tag
`@open-pioneer/toc@1.5.0`). Grund: Das Original hat keine Erweiterungspunkte für eigene Inhalte pro Layer.

- **Änderungen gegenüber Upstream** stehen in `src/packages/toc/README.md` („Changes in this fork“). Bei einem Update:
  Upstream-Version neu übernehmen und diese Änderungen erneut einspielen.
- **`layerItemContent(layer)`**: Prop am `Toc`. Der Rückgabewert erscheint direkt unter dem Titel eines Layers.
  Das Dashboard liefert dort für jeden WMS-Layer einen **Transparenz-Slider** (`toc/LayerOpacitySlider.tsx`,
  0 % = deckend, Startwert aus `opacity` im JSON). Die Funktion sollte eine stabile Identität haben (Modulebene).
  Das ⋮-Menü ist unverändert wie im Original (zeigt die Beschreibung).
- **TOC-Panel** (`toc/TocPanel.tsx`): enthält Überschrift, Sprachumschalter und `Toc`. Es lässt sich nach links
  einklappen, dann bleibt oben links nur ein Ebenen-Button. Das Panel liegt bewusst **nicht** in einer `MapAnchor`,
  sondern als eigene Ebene über der Karte: `MapAnchor` schneidet Inhalte ab (`overflow: hidden`) und fängt in ihrem
  Bereich Kartenklicks ab. Der Rahmen hat `pointer-events: none`, nur Panel und Button reagieren auf Klicks.

## Sprache (i18n)

- Unterstützte Sprachen: `en`, `de` (`build.config.mjs` → `i18n`, Texte in `i18n/*.yaml`, im TOC-Fork eigene Texte).
- **Standardsprache Englisch**, unabhängig von der Browsersprache (`config.locale` in `app.ts`).
- **Live-Wechsel ohne Neustart**: `advanced.enableLiveLocaleChanges` in `app.ts`. Kartenausschnitt, Auswahl und Zeitfilter bleiben erhalten.
- **Sprachumschalter EN | DE** neben „Ebenen“ im TOC (`toc/LanguageSelector.tsx`, Chakra `SegmentGroup`, nutzt `runtime.LocaleService`).
- Layernamen aus dem JSON werden beim Start in der aktuellen Sprache erzeugt (`MainMapProvider` bekommt den
  `LocaleService` injiziert) und bei jedem Wechsel per `useLocalizedDataLayers()` aktualisiert (`layer.setTitle`).
- Popup- und Diagrammtitel lesen den Layernamen live aus der Karte (`dataLayers/useLayerTitle.ts`).
- Daten vom Server (z. B. Datastream-Name aus der STA) werden nicht übersetzt und erscheinen klein neben dem Titel.
- Grenze: Die nativen Datumsfelder im Zeitfilter formatieren nach der Browsersprache, nicht nach der App-Sprache.

## Services

- Klasse in `services.ts` exportieren und in `build.config.mjs` registrieren:
  `services: { MainMapProvider: { provides: ["map.MapConfigProvider"] } }`.
- Abhängigkeiten zwischen Services: `references: { name: "interface.name" }` im Service-Eintrag.
- Services aus React heraus nutzen: in `build.config.mjs` `ui: { references: ["interface.name"] }` eintragen
  und in der Komponente `useService<T>("interface.name")` (aus `open-pioneer:react-hooks`) aufrufen.

## Karte

- `MainMapProvider` implementiert `MapConfigProvider` mit `mapId = MAP_ID` und liefert `initialView`, `projection`, `baseLayers` (und später `layers`).
- In React: `useMapModel(MAP_ID)` → `<DefaultMapProvider map={map}>` → `<MapContainer>`; UI-Elemente auf der Karte per `<MapAnchor position="top-left" | ...>`.
- Komponenten wie `<Toc />`, `<ZoomIn />` finden die Karte über den `DefaultMapProvider` automatisch.

## Lokale Pakete

- Aktuell: `src/packages/toc` (`@cosite/toc`, siehe oben).
- Neues Paket unter `src/packages/<name>/` mit eigener `package.json` (+ `build.config.mjs`, falls Services/i18n/Styles).
- In der App einbinden: `"<name>": "workspace:*"` in der App-`package.json`, `pnpm install`.
- `typedoc.config.mjs` dokumentiert alle Pakete unter `src/packages/**` (`pnpm build-docs`, läuft auch in der CI).

## Tests

- Vitest mit `happy-dom`, Setup in `src/testing/global-setup.ts`; Testdateien `*.test.ts(x)` neben dem Code.
- Siehe [How to write tests](./tutorials/HowToWriteTests.md).
