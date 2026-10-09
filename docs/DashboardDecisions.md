# Dashboard: Entstehung und Entscheidungen

Dieses Dokument hält fest, **warum** das COSITE-Dashboard so gebaut ist, wie es ist: welche Entscheidungen
getroffen wurden, welche Alternativen verworfen wurden und wo es Stolpersteine gab.
**Wie** die Teile technisch verdrahtet sind, steht in [DashboardWiring.md](./DashboardWiring.md).

Jedes Element folgt demselben Schema: **Was** · **Entscheidung** · **Warum** · **Verworfen** · **Stolpersteine** ·
**Offen/Risiken** · **Commits**. Die Markierung zeigt, wie viel Abstimmung oder Fehlersuche nötig war:
🟢 einfach · 🟡 mittel · 🔴 schwierig.

## Überblick

- **Ziel:** Aus dem _Open Pioneer Trails Starter_ (Mischung aus How-to und Demonstrator) eine schlanke App machen:
  Hintergrundkarte, TOC, Panel unten mit Diagrammen nach Klick in die Karte.
- **Branch:** Alles passiert auf `dashboard` (soll später umbenannt werden). `main` bleibt unverändert wie geklont.
- **Arbeitsweise:** Ein Commit pro abgeschlossenem Schritt, kein Push ohne Rückfrage. Der Pre-Commit-Hook führt
  `tsc`, oxfmt und oxlint aus, jeder Schritt muss also für sich bauen.

| #   | Element                                                               | Schwierigkeit |
| --- | --------------------------------------------------------------------- | ------------- |
| 1   | [Aufräumen des Starters](#1-aufräumen-des-starters)                   | 🟢            |
| 2   | [App-Grundgerüst](#2-app-grundgerüst)                                 | 🟢            |
| 3   | [Build und Abhängigkeiten](#3-build-und-abhängigkeiten)               | 🟡            |
| 4   | [Datenlayer-Konfiguration (JSON)](#4-datenlayer-konfiguration-json)   | 🟡            |
| 5   | [Datenquellen](#5-datenquellen)                                       | 🟡            |
| 6   | [Kategorien im TOC](#6-kategorien-untergruppen-im-toc)                | 🟢            |
| 7   | [FeatureInfo-Popup](#7-featureinfo-popup)                             | 🟡            |
| 8   | [Diagramme und Zeitfilter](#8-diagramme-und-zeitfilter)               | 🟡            |
| 9   | [TOC-Fork und Transparenz-Slider](#9-toc-fork-und-transparenz-slider) | 🔴            |
| 10  | [Mehrsprachigkeit](#10-mehrsprachigkeit)                              | 🟡            |
| 11  | [Einklappbares TOC-Panel](#11-einklappbares-toc-panel)                | 🔴            |
| 12  | [WMS-Legende](#12-wms-legende)                                        | 🔴            |
| 13  | [Popup-Platzierung und Marker](#13-popup-platzierung-und-marker)      | 🟡            |
| 14  | [Testen](#14-testen)                                                  | 🟢            |
| 15  | [Offene Punkte](#15-offene-punkte-und-ideen)                          |               |

Alle Commits auf `dashboard` (2026-10-09, älteste zuerst):

| Commit    | Inhalt                                                      |
| --------- | ----------------------------------------------------------- |
| `aa783cd` | Samples, Beispielpaket und Sites entfernt                   |
| `c81b2de` | Build-Konfiguration und CI angepasst                        |
| `a535bb3` | Dashboard-App mit Karte, TOC und einklappbarem Bottom-Panel |
| `3268f05` | Doku: Verdrahtung                                           |
| `d9f88b3` | Datenlayer: Schema, Parser, Laden zur Laufzeit              |
| `6a1d0da` | Layer aus der Konfiguration erzeugen (WMS, SensorThings)    |
| `e1415f4` | Doku: Datenlayer-Konfiguration                              |
| `4c237a1` | Kategorien (Gruppen) in der Konfiguration                   |
| `6268f50` | WMS-GetFeatureInfo im Popup                                 |
| `f71ec9a` | Diagramm mit Zeitfilter im Bottom-Panel                     |
| `3cff0ea` | Lizenz-Override für `pako` 2.2.0                            |
| `f0eefec` | Doku: Kategorien, FeatureInfo, Diagramme, Zeitfilter        |
| `cb6feb5` | TOC als lokales Paket `@cosite/toc` geforkt                 |
| `58c94ff` | Transparenz-Slider im ⋮-Menü (später ersetzt)               |
| `7acb8be` | Live-Sprachwechsel (de/en)                                  |
| `8c3b040` | Doku: TOC-Fork, Slider, i18n                                |
| `5c52ad7` | Transparenz-Slider direkt unter dem Layernamen              |
| `f37ab3c` | Englisch als Standard, EN\|DE-Umschalter statt Dropdown     |
| `3452a7a` | Doku angepasst                                              |
| `237a773` | TOC-Panel nach links einklappbar                            |
| `abff501` | Doku: einklappbares TOC-Panel                               |
| `8256091` | WMS-Legende im FeatureInfo-Popup                            |
| `0cf7594` | Popup-Kopf (✕) bleibt beim Scrollen sichtbar                |
| `7802450` | Doku: WMS-Legende                                           |
| `74b09ed` | Marker an der Klickposition, Popup daneben                  |
| `2fc058c` | Doku: Marker und Popup-Platzierung                          |

---

## 1. Aufräumen des Starters

🟢 **Was:** Alles entfernen, was nichts mit dem Dashboard zu tun hat.

- **Entscheidung:** `src/samples/` (map-sample, i18n-howto), `src/packages/sample-package/`, `src/apps/empty/` und
  `src/sites/` gelöscht. Behalten: `docs/**` als Wissensspeicher, `support/**`, `patches/**`, Tooling-Konfiguration.
  Die Root-Seite `src/index.html` hostet direkt das Dashboard (`pnpm dev` öffnet es sofort).
- **Warum:** Die Samples zeigten, wie man etwas macht, waren aber kein Teil des Produkts. Die Docs sind als
  Nachschlagewerk weiter nützlich.
- **Stolpersteine:** Ohne Pakete unter `src/packages/` hat Typedoc nichts zu dokumentieren, deshalb flog der CI-Schritt
  `build-docs` vorübergehend raus. Mit dem TOC-Fork (Abschnitt 9) gibt es wieder ein Paket, der Schritt ist zurück.
- **Commits:** `aa783cd`, `c81b2de`

## 2. App-Grundgerüst

🟢 **Was:** Neue App `src/apps/dashboard` mit OSM-Karte, TOC oben links, Zoom-Buttons und einklappbarem Panel unten.

- **Entscheidung:** Aufbau nach dem Muster des entfernten Map-Samples (`MapConfigProvider` als Service,
  `useMapModel` → `DefaultMapProvider` → `MapContainer`). Das Panel unten nutzt Chakra `Collapsible`.
- **Stolpersteine:** `SectionHeading` aus `@open-pioneer/react-utils` wirft einen Fehler, wenn es nicht innerhalb einer
  `TitledSection` steht. Das fiel erst beim Lesen des Quellcodes auf und ist jetzt in Panel und TOC berücksichtigt.
- **Commits:** `a535bb3`

## 3. Build und Abhängigkeiten

🟡 **Was:** Probleme, die beim Umbau mit dem Paketmanager und der CI auftraten.

- **pnpm-Trust-Policy:** `pnpm install` brach ab mit „Missing time for version 1.3.1 of tinyexec“. Die Registry hat den
  Zeitstempel, nur die lokal gecachten Metadaten nicht. Lösung: `pnpm cache delete tinyexec`. An den
  Sicherheitsrichtlinien wurde nichts geändert.
- **`resize-observer-polyfill`:** wird in `src/testing/global-setup.ts` gebraucht, kam aber nur transitiv über die
  Kartenpakete der Samples. Nach deren Löschen scheiterte der Pre-Commit-`tsc`. Mit den Kartenpaketen der neuen App
  ist es wieder da. Deshalb liegt das Lockfile damals in einem späteren Commit.
- **`pako`-Lizenz:** Beim Neuaufbau des Lockfiles stieg `pako` von 2.1.0 auf 2.2.0. Der Lizenzreport (CI) kannte nur
  die Ausnahme für 2.1.0. Lizenz unverändert (MIT und Zlib), nur die Version in `support/license-config.yaml` angepasst.
- **Offen:** `CHANGELOG.md` hat einen Formatfehler (`pnpm fmt:check`), der schon auf `main` besteht und bewusst nicht
  angefasst wurde.
- **Commits:** `c81b2de`, `a535bb3`, `3cff0ea`

## 4. Datenlayer-Konfiguration (JSON)

🟡 **Was:** Datenlayer stehen nicht im Code, sondern in `src/public/config/dataLayers.json`
(Name, Beschreibung, Endpunkt, Typ …).

- **Entscheidung:** Die Datei wird **zur Laufzeit** per `fetch` geladen, nicht beim Build importiert.
- **Warum:** Wunsch, Layer nach dem Deployment ändern zu können, ohne neu zu bauen. Ein Backend ist dafür nicht nötig:
  Vite kopiert `src/public` unverändert nach `dist/www`, der Webserver liefert die Datei statisch aus, der Browser parst
  sie mit `response.json()`. Über `VITE_DATA_LAYERS_URL` kann sie später auch aus einem Bucket oder einer API kommen
  (dann muss der Server CORS erlauben).
- **Verworfen:** Import beim Build (typgeprüft, aber jede Änderung braucht einen Neubau).
- **Robustheit:** `parseDataLayers` prüft jeden Eintrag und überspringt ungültige mit Warnung. Fehlt die Datei oder ist
  sie kaputt, startet die Karte nur mit der Basemap. Beides getestet.
- **Commits:** `d9f88b3`, `6a1d0da`, `e1415f4`

## 5. Datenquellen

🟡 **Was:** Ein DWD-Dienst mit 2-m-Temperatur und der vorgegebene SensorThings-Datastream.

- **DWD:** Gewählt wurde der WMS-Layer `Icon_reg025_fd_sl_T2M` („Lufttemperatur in 2m aus ICON“, Vorhersage, stündliche
  Zeitdimension, ohne `TIME` liefert der Server den Standardzeitpunkt). Zur Wahl stand auch `RBSN_T2m` (gemessene Werte
  an DWD-Stationen). Entscheidung des Nutzers: ICON. Nachteil: Das Raster ist grob (0,25°).
- **SensorThings:** `https://cosite.thk.52north.org/sensordata/v1.1/Datastreams(14)` ist **Boden**temperatur
  (SMT100, Köln-Kalk), keine Lufttemperatur in 2 m. So ist es auch benannt. CORS ist erlaubt.
- **Startansicht:** Köln statt Münster, damit Sensorpunkt und Temperaturraster sofort sichtbar sind.
- **Auffällig in den Daten:** Am 06.10. stehen zwei Messwerte mit genau `0` (12:34 und 12:37 UTC), vermutlich
  Sensor-Ausreißer. Bewusst nicht gefiltert, das wäre eine fachliche Entscheidung.
- **Commits:** `6a1d0da`

## 6. Kategorien (Untergruppen) im TOC

🟢 **Was:** Layer in der JSON-Datei in Kategorien gruppieren, im TOC als Gruppen anzeigen (aktuell „WMS“ und
„Sensoren (STA)“).

- **Entscheidung:** Ein Eintrag mit `"type": "group"` hat eine eigene `layers`-Liste und darf verschachtelt werden.
  Daraus wird ein `GroupLayer`, im TOC mit `collapsibleGroups` einklappbar und als Ganzes schaltbar.
- **Warum so:** Kategorien sind damit derselbe Mechanismus wie Layer (gleiche Felder, gleicher Parser), statt einer
  zweiten Struktur daneben.
- **Zu wissen:** Die Reihenfolge in der Datei ist die Zeichenreihenfolge: spätere Einträge liegen auf der Karte oben und
  stehen im TOC weiter oben. IDs müssen über die ganze Datei eindeutig sein.
- **Commits:** `4c237a1`

## 7. FeatureInfo-Popup

🟡 **Was:** Klick in die Karte zeigt die Werte des DWD-Layers an dieser Stelle.

- **Entscheidung:** `GetFeatureInfo` als GeoJSON (`INFO_FORMAT=application/json`). Welche Felder mit welcher
  Beschriftung und Einheit erscheinen, steht pro Layer in `wms.featureInfo.fields`. Ohne Angabe werden alle Rohattribute
  gezeigt.
- **Warum:** Die Rohdaten des DWD heißen z. B. `Temperature_height_level_above_ground` und haben viele Nachkommastellen.
  Mit Feldkonfiguration steht dort „Lufttemperatur 2 m: 8,3 °C“.
- **Zu wissen:** Abgefragt werden nur Layer, die wirklich sichtbar sind, also auch alle übergeordneten Gruppen.
  Zeitstempel werden in Ortszeit angezeigt.
- **Commits:** `6268f50`

## 8. Diagramme und Zeitfilter

🟡 **Was:** Klick auf den Sensorpunkt lädt die Messwerte und zeichnet sie im Panel unten. Zeitfilter mit Presets
(24 Stunden, 7 Tage, 30 Tage) und eigenem Zeitraum von/bis.

- **Entscheidung:** Chart.js.
- **Warum / verworfen:** Auf dem alten Branch `origin/test/charts` wurde recharts (über `@chakra-ui/charts`) getestet und
  musste gepatcht werden: recharts sucht Elemente über `document`, Trails rendert die App aber im Shadow DOM.
  Chart.js zeichnet auf Canvas und braucht das nicht.
- **Details:**
    - Lücken in den Daten (z. B. ca. 17.09.–05.10.) bleiben Lücken statt einer geraden Linie, die Messwerte vortäuscht.
    - Die x-Achse zeigt genau den gewählten Zeitraum.
    - `degC` aus der STA wird als `°C` angezeigt.
    - Höchstens 20.000 Werte, danach Hinweis „gekürzt“.
    - Ungültiger Zeitraum (von ≥ bis) wird markiert, der letzte gültige bleibt aktiv.
- **Grenze:** Die nativen Datumsfelder formatieren nach der Browsersprache, nicht nach der App-Sprache.
- **Commits:** `f71ec9a`

## 9. TOC-Fork und Transparenz-Slider

🔴 **Was:** Ein Transparenz-Slider für jeden WMS-Layer im TOC.

- **Problem:** `@open-pioneer/toc` exportiert nur die fertige `Toc`-Komponente. Es gibt keinen Prop und keinen Slot für
  eigene Inhalte pro Layer, auch nicht im ⋮-Menü.
- **Betrachtete Wege:**
    1. Eigener TOC: volle Kontrolle, aber alle TOC-Funktionen nachbauen.
    2. Standard-TOC behalten und den Slider per DOM-Portal in die Einträge hängen: wenig Code, aber abhängig von internen
       CSS-Klassen und Render-Details, bricht leicht bei Updates.
    3. Slider-Bereich unter dem TOC: robust, aber nicht beim jeweiligen Layer.
    4. TOC forken und um einen Slot erweitern.
- **Entscheidung:** Fork als lokales Paket `src/packages/toc` (`@cosite/toc`), übernommen aus dem Upstream-Tag
  `@open-pioneer/toc@1.5.0` (Apache-2.0).
- **Verlauf:** Auf Wunsch des Nutzers zuerst als Schnittstelle im ⋮-Menü (`layerMenuContent`). Ergebnis: Der Slider war
  erst nach einem Klick zu sehen und wurde übersehen. Deshalb ersetzt durch `layerItemContent(layer)`: Der Slider steht
  direkt unter dem Layernamen. Das ⋮-Menü ist wieder im Originalzustand.
- **Risiko:** Upstream-Updates des TOC müssen von Hand nachgezogen werden. Alle Änderungen am Fork stehen in
  `src/packages/toc/README.md` („Changes in this fork“). Die Upstream-Tests wurden nicht übernommen, weil sie interne
  Upstream-Testpakete brauchen.
- **Commits:** `cb6feb5`, `58c94ff`, `5c52ad7`

## 10. Mehrsprachigkeit

🟡 **Was:** Oberfläche und Layertexte auf Englisch und Deutsch, umschaltbar.

- **Entscheidung:** Live-Wechsel ohne Neustart (`advanced.enableLiveLocaleChanges` in `app.ts`). Kartenausschnitt,
  Auswahl und Zeitfilter bleiben beim Wechsel erhalten. Im Standardmodus von Trails würde die App neu starten.
- **Texte im JSON:** `name`, `description` und Popup-Beschriftungen dürfen `{ "de": …, "en": … }` sein. Fehlt eine
  Sprache, wird Englisch genommen, sonst der erste Eintrag.
- **Technik:** Der `MapConfigProvider` bekommt den `LocaleService` injiziert und erzeugt die Layer in der aktuellen
  Sprache. Bei jedem Wechsel setzt `useLocalizedDataLayers()` die Titel neu. Popup- und Diagrammtitel lesen den Titel
  live aus der Karte.
- **Verlauf:** Erst Dropdown mit Browsersprache als Standard. Auf Wunsch geändert zu: **Englisch als Standard**
  (`config.locale`), unabhängig vom Browser, und ein **EN|DE-Umschalter** (Chakra `SegmentGroup`) statt Dropdown.
- **Grenze:** Daten vom Server (z. B. der STA-Name „SMT100 Soil Temperature“) werden nicht übersetzt und stehen klein
  neben dem übersetzten Titel.
- **Commits:** `7acb8be`, `f37ab3c`

## 11. Einklappbares TOC-Panel

🔴 **Was:** Die Ebenen-Box (TOC) gleitet nach links aus dem Bild, ein kleiner Ebenen-Button bleibt zum Öffnen.

- **Stolperstein 1:** Die Trails-`MapAnchor` hat eine eigene Größe und nimmt Klicks an. Ein nur verschobenes Panel
  hinterließ einen unsichtbaren Bereich, in dem Kartenklicks nicht ankamen.
- **Stolperstein 2:** Die `MapAnchor` hat `overflow: hidden`. Mit absolut positioniertem Inhalt schrumpfte sie auf null,
  und Panel und Button waren abgeschnitten, also unsichtbar.
- **Entscheidung:** Das Panel sitzt nicht mehr in einer `MapAnchor`, sondern als eigene Ebene über der Karte. Der Rahmen
  hat `pointer-events: none`, nur Panel und Button nehmen Klicks an. Eingeklappt ist das Panel `inert` (nicht per Tab
  erreichbar), der Fokus springt beim Umschalten auf den jeweils sichtbaren Button.
- **Commits:** `237a773`

## 12. WMS-Legende

🔴 **Was:** Die Legende des WMS-Layers im FeatureInfo-Popup. Legenden waren der aufwendigste Teil.

- **Stolperstein 1, Upstream-Fehler:** `@open-pioneer/map` 1.5.0 fragt die Capabilities fest mit `LANGUAGE=ger` an
  (`WMSLayer.js`). Der DWD-GeoServer antwortet darauf mit einem Fehler („no international content defined“). Die Karte
  ignoriert das stillschweigend: Der Layer gilt als geladen, aber es gibt keine Legenden-URL.
- **Lösung:** Fehlt die URL aus den Capabilities, baut die App eine Standard-Anfrage
  `{endpoint}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER={name}`
  (`mapClick/WmsLegend.tsx`). Bei Servern mit funktionierenden Capabilities wird deren URL genommen.
- **Stolperstein 2, Bildformat:** Die Standardlegende ist 88×505 px hochkant, die querliegende Variante 1544 px breit.
  Beides passt schlecht in ein Popup.
- **Versuche:**
    1. Popup je nach Platz ober- oder unterhalb öffnen: verworfen, zu aufwendig für das Problem.
    2. Bild im Browser verkleinern (100 px, dann 80 px Höhe): erst verzerrt (Breite blieb stehen), dann proportional,
       aber unlesbar.
    3. **Serverseitig klein zeichnen lassen:** `LEGEND_OPTIONS=columns:4;fontSize:9` und `WIDTH/HEIGHT=12` ergeben
       242×77 px, scharf und lesbar. Das ist die aktuelle Lösung, konfiguriert pro Layer in `wms.legend.params`.
- **Risiken bei anderen Layern** (bewusst vorerst so gelassen):
    - `GetLegendGraphic` ist eine Erweiterung, kein Pflichtteil des WMS-Standards. GeoServer, MapServer, QGIS Server und
      ArcGIS können es, andere eventuell nicht. Dann erscheint ein kaputtes Bild, Ladefehler werden nicht abgefangen.
    - `LEGEND_OPTIONS` versteht nur GeoServer. Andere Server ignorieren den Parameter meist, ein sehr strenger könnte ihn
      ablehnen. Betrifft nur Layer, bei denen man ihn bewusst setzt.
    - Konfigurierte Parameter werden mit `searchParams.set` gesetzt. Enthält eine Capabilities-URL schon `width=20`, steht
      danach zusätzlich `WIDTH=12` in der URL, statt den Wert zu ersetzen. Welcher gilt, hängt vom Server ab.
    - Die Ersatz-URL fragt immer den Standardstil an. Wird ein Layer mit einem bestimmten Stil eingebunden, kann die
      Legende abweichen.
    - Sehr hohe Legenden passen über den Scroll im Popup trotzdem hinein.
- **Commits:** `8256091`, `7802450`

## 13. Popup-Platzierung und Marker

🟡 **Was:** Wo das FeatureInfo-Popup erscheint und wie man sieht, wohin geklickt wurde.

- **Verlauf:**
    1. Anfangs öffnete sich das Popup über dem Klickpunkt. Mit der Legende wurde es höher und ragte oben aus der Karte.
    2. Ein Kopf mit ✕, der beim Scrollen stehen bleibt, kam auf Wunsch dazu (`0cf7594`).
    3. Wunsch des Nutzers: Marker an der Klickstelle, Popup daneben, Oberkante unterhalb des Klicks. Passt es unten nicht
       hin, soll es zwischen Analyse-Panel und Oberkante sichtbar bleiben.
- **Entscheidung:** Blauer Pin über `map.highlights` (`mapClick/clickMarker.ts`). Das Popup steht rechts neben dem
  Marker (am rechten Rand links davon), mit der Oberkante 8 px unter dem Klick. Reicht der Platz nach unten nicht, wird es
  gerade so weit hochgeschoben, dass es ganz sichtbar ist (`mapClick/popupPlacement.ts`). Weil die Popup-Größe sich
  beim Laden und durch die nachladende Legende ändert, wird die Position per `ResizeObserver` und bei Größenänderung der
  Karte neu berechnet.
- **Höhe und Scroll:** Das Popup ist höchstens Kartenhöhe minus 16 px, maximal 400 px hoch. Erst wenn der Inhalt höher
  ist, scrollt er. Mit der kompakten DWD-Legende (Inhalt ca. 250 px) passt meist alles, ein Scrollbalken erscheint dann
  nicht.
- **Commits:** `0cf7594`, `74b09ed`, `2fc058c`

## 14. Testen

🟢 **Was:** Wie die Änderungen geprüft wurden.

- **Vitest** (`pnpm vitest run`): Parser der Konfiguration inkl. Gruppen, Mehrsprachigkeit, FeatureInfo- und
  Legenden-Optionen; Zeitfilter; Lücken im Diagramm; Legenden-URL; Popup-Platzierung.
- **Im Browser:** Jede UI-Änderung wurde mit Headless-Chromium gegen `pnpm preview` geprüft, gesteuert über das Chrome
  DevTools Protocol (Klicks, Screenshots, Netzwerk-Requests, Konsolenfehler). Die Skripte liegen nicht im Repo.
- **CI-relevant:** `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm build-docs`, `pnpm build-license-report`.

## 15. Offene Punkte und Ideen

- **Legende absichern:** Bild bei Ladefehler ausblenden; Parameter unabhängig von Groß-/Kleinschreibung ersetzen
  (siehe Abschnitt 12). Vorerst bewusst nicht umgesetzt.
- **Upstream-Issue:** Fest eingebautes `LANGUAGE=ger` in `@open-pioneer/map` melden. Wird es behoben, nutzt die App
  automatisch die Legenden-URLs aus den Capabilities.
- **Weitere Diagramme:** Ursprünglicher Wunsch: „Graphen verschiedener Natur“ im Panel unten.
- **CI-Deploy:** Der Job `deploy` in `.github/workflows/test-and-build.yml` ist noch an das Repository
  `open-pioneer/trails-starter` gebunden und läuft hier daher nie.
- **Daten:** Umgang mit Sensor-Ausreißern (z. B. `0`-Werte) fachlich klären.
- **Fork-Pflege:** `@cosite/toc` bei Updates von `@open-pioneer/toc` abgleichen.
