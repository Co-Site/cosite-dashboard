# Dashboard: Wie das Projekt verdrahtet ist

Kurzreferenz, wie Workspace, Vite, Apps, Services und Pakete zusammenhängen.
Warum etwas so gelöst ist und welche Alternativen es gab: [DashboardDecisions.md](./DashboardDecisions.md).
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
- `server.proxy` und `preview.proxy` (`SERVICE_PROXIES`): leiten `/proxy/leverkusen/…` an `https://geoportal.leverkusen.de/…`
  weiter, siehe [Proxy für Dienste ohne CORS](#proxy-für-dienste-ohne-cors).

## App-Aufbau (`src/apps/dashboard`)

| Datei              | Zweck                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`     | Paketname + Abhängigkeiten (alle über `catalog:`)                                                                                                                                    |
| `build.config.mjs` | `defineBuildConfig({ i18n, styles, services, ui })` – Sprachen, CSS, Service-Registrierung, UI-Referenzen                                                                            |
| `app.ts`           | `createCustomElement({ component, appMetadata })` + `customElements.define("dashboard-app", ...)`                                                                                    |
| `services.ts`      | Service-Klassen, z. B. `MainMapProvider` (Kartenkonfiguration)                                                                                                                       |
| `DashboardApp.tsx` | Root-Komponente: Karte, TOC, Kartenwerkzeuge, Analyse-Panel                                                                                                                          |
| `i18n/*.yaml`      | Übersetzungen, Zugriff über `useIntl().formatMessage({ id })`                                                                                                                        |
| `dataLayers/`      | Datenlayer: JSON-Schema (`types.ts`), Loader + Parser (`loadDataLayers.ts`), Layer-Fabrik, SensorThings-Helfer (`sta.ts`), WMS-/WFS-Helfer (`ogcService.ts`, `wfs*.ts`)              |
| `mapClick/`        | Kartenklick: Popup mit allen Sensoren an der Stelle oder mit den Attributen von WFS-Features und WMS-GetFeatureInfo                                                                  |
| `charts/`          | Analyse-Panel unten (`AnalysisPanel.tsx`, Tabs „Einzelsensor“ / „Sensorvergleich“), Zeitfilter, Sensor- und Typauswahl, Messwerte laden, Diagramme: Linie, Balken, Boxplot, Windrose |
| `toc/`             | Ergänzungen zum TOC: Transparenz-Slider, Sprachumschalter (EN/DE), Übersetzung der Layernamen, eigene WMS/WFS hinzufügen                                                             |

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

| Feld                      | Pflicht     | Bedeutung                                                                       |
| ------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `id`                      | ja          | Eindeutige ID (über die ganze Datei), auch Layer-ID in der Karte                |
| `type`                    | ja          | `group`, `wms`, `wfs` oder `sta-datastream`                                     |
| `name`                    | ja¹         | Anzeigename im TOC (Text oder pro Sprache, s. u.)                               |
| `description`             | nein        | Beschreibung im ⋮-Menü des Layers (Text oder pro Sprache)                       |
| `visible`                 | nein        | Initial sichtbar (Default `true`)                                               |
| `opacity`                 | nein        | Deckkraft 0–1 (Default `1`)                                                     |
| `layers`                  | bei `group` | Enthaltene Layer und Kategorien                                                 |
| `endpoint`                | bei Layern  | URL des Dienstes (WMS-/WFS-Basis-URL bzw. URL des SensorThings-Datastreams)²    |
| `attribution`             | nein        | Quellenangabe auf der Karte                                                     |
| `wms.layers`              | bei `wms`   | Liste der WMS-Layernamen aus den Capabilities                                   |
| `wms.featureInfo.enabled` | nein        | GetFeatureInfo beim Kartenklick (Default `true`)                                |
| `wms.featureInfo.format`  | nein        | Antwortformat (GeoJSON); ohne Angabe aus den Capabilities, s. u.                |
| `wms.featureInfo.fields`  | nein        | Anzuzeigende Attribute `{ property, label?, unit? }`; ohne Angabe: alle         |
| `wms.legend.enabled`      | nein        | Legende im FeatureInfo-Popup (Default `true`)                                   |
| `wms.legend.url`          | nein        | Eigene Legenden-URL statt Capabilities/GetLegendGraphic                         |
| `wms.legend.params`       | nein        | Zusätzliche URL-Parameter, z. B. `{ "LEGEND_OPTIONS": "columns:4;fontSize:9" }` |
| `wfs.featureType`         | bei `wfs`   | Name des Feature-Typs aus den Capabilities, z. B. `app:bezirke`                 |
| `wfs.version`             | nein        | `2.0.0` oder `1.1.0`; ohne Angabe die neueste, die der Dienst kann              |
| `wfs.outputFormat`        | nein        | GetFeature-Format; ohne Angabe aus den Capabilities (GeoJSON vor GML)           |
| `wfs.maxFeatures`         | nein        | Höchstzahl Features pro Anfrage (Default `1000`)                                |
| `wfs.color`               | nein        | Farbe der Features (CSS); ohne Angabe aus der Layer-ID abgeleitet               |
| `wfs.featureInfo.enabled` | nein        | Attribute beim Kartenklick zeigen (Default `true`)                              |
| `wfs.featureInfo.fields`  | nein        | Anzuzeigende Attribute wie bei `wms.featureInfo.fields`                         |

¹ Bei `wms` und `wfs` optional: Ohne `name` zeigt das TOC den Titel aus den Capabilities (Sprache des Dienstes, meist
Deutsch), bis dahin den Layernamen bzw. den Namen des Feature-Typs. Ohne `description` wird der Abstract übernommen, wenn er sich vom Titel unterscheidet.
Dafür lädt die App die Capabilities selbst (`dataLayers/wmsCapabilities.ts` bzw. `wfsCapabilities.ts`, ohne
`LANGUAGE`, einmal pro Dienst).
Hat ein WMS-Eintrag mehrere `wms.layers`, bekommen die Unterlayer ihre Titel immer aus den Capabilities.

² Relative URLs (z. B. `./proxy/leverkusen/GCGisService`) löst `parseDataLayers` gegen die URL der App auf. So
funktioniert derselbe Eintrag lokal und auf dem Server, siehe [Proxy für Dienste ohne CORS](#proxy-für-dienste-ohne-cors).

**FeatureInfo-Format:** Die App liest nur GeoJSON. Ohne `format` wählt sie aus den Capabilities `application/json`
(GeoServer), sonst `application/geo+json` (ArcGIS, MapServer). Bietet der Dienst beides nicht an oder ist der Layer
nicht `queryable`, wird er beim Kartenklick nicht abgefragt. Ein festes `format` spart das Laden der Capabilities
(bei DWD ca. 1 MB), deshalb steht es bei den DWD-Layern in der Konfiguration.

**Attribution:** Nur `attribution` aus der Konfiguration. `@open-pioneer/map` würde sonst `AccessConstraints` oder
`Fees` des Dienstes als Quellenangabe zeigen (bei DWD eine nackte URL).

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
- **`wfs`** → `SimpleLayer` + OL-`VectorLayer` (`dataLayers/wfsLayer.ts`). Geladen wird nur der Kartenausschnitt
  (`bbox`-Strategie) in einem projizierten KBS (EPSG:3857, sonst 25832/25833), als GeoJSON oder GML. Style je
  Geometrietyp in der Farbe des Layers (`dataLayers/wfsStyle.ts`). Hintergrund: `DashboardDecisions.md`, Abschnitt 19.
- **`sta-datastream`** → Punktlayer (`SimpleLayer` + OL-`VectorLayer`) an der Location des Things.
  Das Feature trägt u. a. `observationsUrl`, `unit` und `name` (siehe `StaDatastreamProperties` in `dataLayers/sta.ts`).
  `healthCheck` auf den Endpunkt markiert den Layer im TOC als nicht verfügbar, wenn der Dienst nicht antwortet.

Jeder erzeugte Layer hat die Original-Konfiguration im Attribut `dataLayer` (`layer.attributes.dataLayer`).
Darüber findet der Kartenklick z. B. die `featureInfo`-Einstellungen eines WMS-Layers.

### Neuen Layertyp hinzufügen

1. In `dataLayers/types.ts` ein neues Interface mit eigenem `type` anlegen, in die Union `DataLayerConfig` aufnehmen
   und in `validateEntry` (`dataLayers/loadDataLayers.ts`) die typspezifischen Felder prüfen.
2. In `dataLayers/createDataLayer.ts` einen `case` für den neuen Typ ergänzen. TypeScript meldet fehlende Fälle.
3. Test in `dataLayers/loadDataLayers.test.ts` erweitern und den Typ hier in der Doku eintragen.

## Kartenklick, Popup und Diagramme

`mapClick/useMapClick.tsx` hört auf Klicks in die Karte:

1. **Sensorpunkt getroffen** (5 px Toleranz, Mauszeiger wird zur Hand): Der Datastream wird ausgewählt und das
   Analyse-Panel (`charts/AnalysisPanel.tsx`) geöffnet. Der Zustand (`datastream`, `timeFilter`, `panelOpen`) liegt in `DashboardApp.tsx`.
2. **Sonst**: Die Features sichtbarer WFS-Layer an der Stelle liefern ihre Attribute direkt (`getWfsFeatureInfo`,
   ohne Anfrage) und werden hervorgehoben. Alle sichtbaren WMS-Layer mit aktiver FeatureInfo werden per
   `GetFeatureInfo` (GeoJSON) abgefragt (`mapClick/featureInfo.ts`). Das Ergebnis erscheint als Popup (`map.overlays`)
   an der Klickposition, WFS vor WMS.
   Zahlen werden lokalisiert, ISO-Zeitstempel in Ortszeit angezeigt. Darunter steht die **Legende** des Layers
   (`mapClick/WmsLegend.tsx`, URLs in `mapClick/legendUrls.ts`). Wird das Popup zu hoch, scrollt nur der Inhalt; Titel und ✕ bleiben sichtbar.
   An der Klickposition erscheint ein **Marker** (`mapClick/clickMarker.ts`, über `map.highlights`). Das Popup steht
   **neben** dem Marker, mit der Oberkante unterhalb des Klicks (am rechten Rand links davon). Passt es unten nicht hin,
   wird es so weit hochgeschoben, dass es zwischen Analyse-Panel und Kartenoberkante ganz sichtbar ist
   (`mapClick/popupPlacement.ts`). Die Platzierung wird neu berechnet, wenn sich die Größe von Popup oder Karte ändert.

**Legenden-URL:** Bevorzugt aus den Capabilities (`sublayer.legend`), sonst eine Standard-`GetLegendGraphic`-Anfrage.
Hintergrund: `@open-pioneer/map` 1.5.0 fragt die Capabilities fest mit `LANGUAGE=ger` an, der DWD-GeoServer antwortet
darauf mit einem Fehler, und die Karte bekommt dann keine Legenden-URL. Mit `wms.legend.params` lässt sich die Legende
serverseitig kompakt zeichnen (GeoServer: `LEGEND_OPTIONS`, `WIDTH`, `HEIGHT`). Das ist schärfer als ein im Browser
verkleinertes Bild.

Im Analyse-Panel (`charts/AnalysisPanel.tsx`):

- **Zeitfilter** (`charts/TimeRangeFilter.tsx`): Presets 24 Stunden, 7 Tage (Default), 30 Tage oder eigener Zeitraum von/bis.
  Ungültige Eingaben (von ≥ bis) werden markiert, der letzte gültige Zeitraum bleibt aktiv.
- **Diagramm** (`charts/DatastreamChart.tsx`, `charts/ObservationChart.tsx`): lädt die Messwerte des Datastreams im
  Zeitraum (`fetchObservations` in `dataLayers/sta.ts`, folgt `@iot.nextLink`, max. 20.000 Werte) und zeigt sie als
  Liniendiagramm mit Tooltip und Fadenkreuz. Lücken in den Daten bleiben als Lücke sichtbar. Darüber stehen
  Anzahl, Min, Max und letzter Wert.
- **Sensor nicht verfügbar**: Scheitert das Laden des Datastreams (Fehler, Zeitlimit 30 s, kein Standort), setzt
  `createStaDatastreamLayer` die Quelle auf `error`. Daraus wird `layer.loadState`: Das TOC markiert den Layer, das
  Panel zeigt über `useSensorLoadFailed` (`dataLayers/useStaSensors.ts`) einen roten Hinweis statt des Spinners.
  Annahmen der STA-Hooks (ein Layer, ein Datastream) stehen in `DashboardDecisions.md`, Abschnitt 8.
- **Weitere Sensoren am Standort** (`charts/SensorTiles.tsx`): `SensorChartView` holt über `useColocatedSensors`
  (`dataLayers/useStaSensors.ts`) die anderen Sensoren am Standort des gewählten Sensors. Der Hook hört auf alle
  STA-Quellen, die Kacheln erscheinen also, sobald die Datastreams geladen sind. Gruppiert wird nach
  `VITE_SENSOR_GROUPING` (`location` = Standard, `thing`, `location-or-thing`; `dataLayers/colocation.ts`) und
  `VITE_SENSOR_GROUPING_RADIUS` (Meter, Standard 1), dafür tragen die Datastream-Properties am Feature (`getDatastreamProperties`) `position` und `thingId`. Jede Kachel lädt den neuesten Wert (`fetchLatestObservation`),
  ein Klick ruft das `onChange` des Dropdowns auf.
- **Chart.js statt recharts**: Trails rendert die App im Shadow DOM. recharts sucht Portale über `document`
  und musste dafür gepatcht werden (siehe alter Branch `origin/test/charts`). Chart.js zeichnet auf Canvas und braucht das nicht.
- Einheiten aus der STA werden für die Anzeige übersetzt (`degC` → `°C`, siehe `displayUnit` in `dataLayers/sta.ts`).

## TOC und Transparenz-Slider

Der TOC ist das unveränderte `@open-pioneer/toc`. Eigene Inhalte pro Layer kommen über seine öffentliche API dazu
(`toc/TocItemExtensions.tsx`):

- `Toc` meldet in `onReady` eine `TocApi`. `TocItemExtensions` liest daraus reaktiv alle Einträge (`api.getItems()`)
  und deren DOM-Element (`TocItem.htmlElement`).
- Für jeden Layer ruft es `layerItemContent(layer)` auf (`toc/layerItemContent.tsx`). Kommt Inhalt zurück, wird ein
  `<div class="toc-layer-item-extra">` ans Ende des Eintrags gehängt und der Inhalt per `createPortal` hineingerendert.
- Das Dashboard liefert so für jeden WMS- und WFS-Layer einen **Transparenz-Slider** unter dem Titel
  (0 % = deckend, Startwert aus `opacity` im JSON). Bei WFS-Layern steht davor ein **Farbfeld** mit der Farbe der Features.
- Hintergrund und Risiken: [DashboardDecisions.md](./DashboardDecisions.md), Abschnitt 9.
- Temporäre Layer (s. u.) bekommen neben dem Slider einen **Entfernen-Button**.
- Lädt das Kartenbild eines WMS-Layers oder lädt ein WFS-Layer keine Features (Ausnahme, HTTP-Fehler), steht über dem
  Slider ein **Warnhinweis**, bis das Laden wieder klappt (`toc/LayerLoadWarning.tsx`). Hat ein WFS-Layer die
  Höchstzahl Features erreicht, steht dort „Nicht alle Features geladen“.
- **TOC-Panel** (`toc/TocPanel.tsx`): enthält Überschrift, Sprachumschalter, „WMS hinzufügen“, „WFS hinzufügen“ und `Toc`. Es lässt sich nach links
  einklappen, dann bleibt oben links nur ein Ebenen-Button. Das Panel liegt bewusst **nicht** in einer `MapAnchor`,
  sondern als eigene Ebene über der Karte: `MapAnchor` schneidet Inhalte ab (`overflow: hidden`) und fängt in ihrem
  Bereich Kartenklicks ab. Der Rahmen hat `pointer-events: none`, nur Panel und Button reagieren auf Klicks.

## Eigene WMS und WFS (temporär)

Unter dem TOC-Titel öffnen „WMS hinzufügen“ und „WFS hinzufügen“ je ein Formular. Beide nutzen dieselben Bausteine:
Formular `toc/AddServiceLayer.tsx`, Dienst laden in `toc/useServiceCapabilities.ts`, Suche in `toc/LayerSearch.tsx`
(Rangfolge in `dataLayers/layerSearch.ts`), Session-Gruppe in `dataLayers/userLayers.ts`. Was je Diensttyp anders ist
(Capabilities, Einträge, Prüfung, Layer-Konfiguration), steht in `toc/userServices.ts` (`WMS_SERVICE`, `WFS_SERVICE`).
Gemeinsame Texte liegen unter `addService.*`, typspezifische unter `addWms.*` bzw. `addWfs.*`. Gespeichert wird nichts,
nach dem Neuladen sind die Layer weg.

1. **URL des Dienstes** eingeben und laden. Eine eingefügte GetCapabilities-URL wird bereinigt
   (`SERVICE`, `REQUEST`, `VERSION`, `LANGUAGE`, `TYPENAME(S)` entfernt, andere Parameter wie `map=` bleiben;
   `normalizeServiceEndpoint` in `dataLayers/ogcService.ts`). `fetchWmsCapabilities` lädt die Capabilities 1.3.0
   einmal pro Dienst und Sitzung, `fetchWfsCapabilities` erst 2.0.0, bei Fehler 1.1.0.
2. **Layer wählen:** Ohne Eingabe stehen alle Layer in einer scrollbaren Liste. Das Suchfeld filtert sie
   (`searchLayers`): exakter Name zuerst, dann Treffer im Titel, dann im Namen. Pfeiltasten und Enter, Klick auf einen
   Eintrag fügt ihn hinzu.
3. **Hinzufügen** (WMS) baut eine normale `WmsDataLayerConfig` mit `temporary: true`: Titel aus den Capabilities, Abstract
   und Anbieter/Nutzungsbedingungen/Gebühren als Beschreibung (Info-Icon im TOC), FeatureInfo-Format wie oben oder
   aus. Abgelehnt werden Layer ohne EPSG:3857, doppelte Layer und Layer, für die der Dienst kein Bild liefert
   (Probe-GetMap mit 1 × 1 Pixel, `probeWmsLayer`; z. B. die benannten Ordnergruppen des DWD).

Die Layer liegen in der Gruppe **„Eigene WMS“** (`user-wms`) direkt unter der Gruppe mit den konfigurierten
WMS-Layern (`dataLayers/userLayers.ts`). Gruppen in `@open-pioneer/map` haben feste Kinder, deshalb wird die Gruppe
bei jedem Hinzufügen oder Entfernen neu gebaut; Sichtbarkeit und Deckkraft der Layer werden übernommen. Der neueste
Layer steht oben. Ohne eigene Layer verschwindet die Gruppe. Die UI erreicht die `LayerFactory` über
`useService("map.LayerFactory")` (in `build.config.mjs` unter `ui.references`).

**WFS:** „Hinzufügen“ baut eine `WfsDataLayerConfig` mit `temporary: true`: Titel und Beschreibung wie beim WMS, die
nächste Farbe der Palette. Abgelehnt werden doppelte Feature-Typen, Feature-Typen ohne GeoJSON- und GML-Ausgabe und
solche, für die der Dienst kein Feature liefert (Probe-GetFeature mit einem Feature, `probeWfsFeatureType`). Die
Layer liegen in der Gruppe **„Eigene WFS“** (`user-wfs`) direkt über dem obersten Layer mit WMS-Layern, also über den
Kartenbildern und unter den Sensoren.

Für temporäre Layer lädt `WMSLayer` keine Capabilities (`fetchCapabilities: false`), die App hat sie schon. Die
Legende kommt dann aus der `LegendURL` der Capabilities, sonst per GetLegendGraphic. Legendenbilder, die nicht laden,
werden ausgeblendet.

## Proxy für Dienste ohne CORS

Der Browser gibt einem Skript die Antwort eines fremden Servers nur, wenn dieser `Access-Control-Allow-Origin`
sendet. `@open-pioneer/map` lädt WMS-Bilder und Capabilities per `fetch`, die App ebenso FeatureInfo. Ohne den Header
bleibt der Layer leer. Für solche Dienste fragt der Browser beim Server des Dashboards an (gleiche Herkunft, keine
CORS-Prüfung), der die Anfrage an den Dienst weiterleitet.

- **Konfiguration:** `endpoint` relativ zur App, z. B. `./proxy/leverkusen/GCGisService`.
- **Lokal:** `pnpm dev` und `pnpm preview` leiten `/proxy/leverkusen/` per Vite weiter (`SERVICE_PROXIES` in
  `vite.config.ts`).
- **Produktiv:** Der Webserver, der das Dashboard ausliefert, braucht denselben Pfad relativ zur App. Beispiel für
  nginx, wenn das Dashboard unter `/dashboard/` liegt:

```nginx
location /dashboard/proxy/leverkusen/ {
    proxy_pass https://geoportal.leverkusen.de/;
    proxy_ssl_server_name on;
}
```

- Das Ziel steht fest in der Konfiguration. Nie die Ziel-URL aus der Anfrage übernehmen, sonst ist es ein offener
  Proxy.
- Liegt vor dem nginx noch ein Load Balancer oder Ingress, muss er den Pfad durchlassen.
- Eigene WMS (temporär) gehen nicht über den Proxy, Dienste ohne CORS lassen sich dort weiterhin nicht hinzufügen.

## Sprache (i18n)

- Unterstützte Sprachen: `en`, `de` (`build.config.mjs` → `i18n`, Texte in `i18n/*.yaml`; der TOC bringt eigene Texte mit).
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

- Aktuell gibt es keine lokalen Pakete unter `src/packages/`.
- Neues Paket unter `src/packages/<name>/` mit eigener `package.json` (+ `build.config.mjs`, falls Services/i18n/Styles).
- In der App einbinden: `"<name>": "workspace:*"` in der App-`package.json`, `pnpm install`.
- `typedoc.config.mjs` dokumentiert alle Pakete unter `src/packages/**`. Der CI-Schritt `pnpm build-docs` ist entfernt,
  solange es keine lokalen Pakete gibt; danach wieder in `.github/workflows/test-and-build.yml` aufnehmen.

## Tests

- Vitest mit `happy-dom`, Setup in `src/testing/global-setup.ts`; Testdateien `*.test.ts(x)` neben dem Code.
- Siehe [How to write tests](./tutorials/HowToWriteTests.md).
