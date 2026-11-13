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
- **Branches:** Entstanden auf `dashboard` (TOC-Fork) und `toc-native` (Original-TOC). `toc-native` wurde gewählt und
  nach `main` gemergt. Repo: `Co-Site/cosite-dashboard`. Seitdem gilt feature → `dev` → `main`, siehe
  [Abschnitt 16](#16-branches-und-arbeitsweise).
- **Arbeitsweise:** Ein Commit pro abgeschlossenem Schritt, Push nur nach `origin` und nur auf Wunsch. Der Pre-Commit-Hook führt `tsc`, oxfmt und
  oxlint aus, jeder Schritt muss also für sich bauen.
- **Grundsatz Config vor STA (2026-10-30):** Ein SensorThings-Server kann falsch oder uneinheitlich konfiguriert sein
  (z. B. `temperature` und `Temperature` als zwei ObservedProperties, `°C` und `degC` als Einheit). Die Config rückt
  das gerade: Wo sie etwas angibt, gilt sie vor den Angaben der STA. Was für ein Feature konfiguriert sein muss und es
  nicht ist, wird im Zweifel nicht angezeigt, statt auf die STA-Angaben zurückzufallen.
- **Grundsatz Die Konfiguration ist verantwortlich (2026-11-13):** Im Betrieb liegt die Korrektheit bei dem, der
  `dataLayers.json` pflegt: Sensoren sorgfältig benennen, den richtigen Key für die Messgröße vergeben, die passende
  Einheit eintragen. Das ist gewollt, kein Versäumnis. Das Dashboard prüft nur die Form der Angaben (Typen), nicht
  ihren Inhalt: Es gleicht Keys nicht untereinander ab, vergleicht Einheiten nicht und rechnet nicht um.
- **Messgröße und Einheit am Sensor (2026-11-13):** Jeder `sta-datastream` kann `observedProperty` (Key, z. B.
  `soil_temperature`) und `unit` tragen. Die Einheit gilt vor `unitOfMeasurement` der STA.
    - **Verworfen:** eine zentrale Liste der Messgrößen (Key, Name de/en, Einheit), auf die Sensoren verweisen. Sie
      hätte eine einheitliche Einheit je Messgröße erzwungen und einen übersetzten Namen geliefert, die Konfiguration
      aber um eine zweite Stelle erweitert. Alles am Sensor ist einfacher zu lesen und zu pflegen.
    - **Folgen:** Der Name der Messgröße kommt weiter aus der STA (Detailzeile im Sensor-Popup, nicht übersetzt). Für
      die Auswahl im Vergleich nach Messgröße gibt es noch keinen übersetzten Namen (offen, siehe `TODO.md`). Der Key
      wird bisher nur geprüft; gelesen wird er erst vom Vergleich, über die Konfiguration am Layer.

| #   | Element                                                                             | Schwierigkeit |
| --- | ----------------------------------------------------------------------------------- | ------------- |
| 1   | [Aufräumen des Starters](#1-aufräumen-des-starters)                                 | 🟢            |
| 2   | [App-Grundgerüst](#2-app-grundgerüst)                                               | 🟢            |
| 3   | [Build und Abhängigkeiten](#3-build-und-abhängigkeiten)                             | 🟡            |
| 4   | [Datenlayer-Konfiguration (JSON)](#4-datenlayer-konfiguration-json)                 | 🟡            |
| 5   | [Datenquellen](#5-datenquellen)                                                     | 🟡            |
| 6   | [Kategorien im TOC](#6-kategorien-untergruppen-im-toc)                              | 🟢            |
| 7   | [FeatureInfo-Popup](#7-featureinfo-popup)                                           | 🟡            |
| 8   | [Diagramme und Zeitfilter](#8-diagramme-und-zeitfilter)                             | 🟡            |
| 9   | [TOC-Erweiterung und Transparenz-Slider](#9-toc-erweiterung-und-transparenz-slider) | 🔴            |
| 10  | [Mehrsprachigkeit](#10-mehrsprachigkeit)                                            | 🟡            |
| 11  | [Einklappbares TOC-Panel](#11-einklappbares-toc-panel)                              | 🔴            |
| 12  | [WMS-Legende](#12-wms-legende)                                                      | 🔴            |
| 13  | [Popup-Platzierung und Marker](#13-popup-platzierung-und-marker)                    | 🟡            |
| 14  | [Testen](#14-testen)                                                                | 🟢            |
| 15  | [Offene Punkte](#15-offene-punkte-und-ideen)                                        |               |
| 16  | [Branches und Arbeitsweise](#16-branches-und-arbeitsweise)                          |               |
| 17  | [Eigene WMS-Layer (temporär)](#17-eigene-wms-layer-temporär)                        | 🔴            |
| 18  | [Geoportal Leverkusen (Proxy)](#18-geoportal-leverkusen-proxy)                      | 🟡            |
| 19  | [Eigene WFS-Layer](#19-eigene-wfs-layer)                                            | 🟡            |

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

Zusätzlich auf Branch `toc-native` (abgezweigt von `dashboard`, Variante ohne TOC-Fork, siehe Abschnitt 9):

| Commit                          | Inhalt                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| `22b279a`                       | TOC-Fork entfernt, Original `@open-pioneer/toc` eingebunden |
| `9dc52cb`                       | Transparenz-Slider über die öffentliche TOC-API             |
| `f3cfda7`                       | Datenquellen: DWD-Radar (RADOLAN-RW), STA Datastream 15     |
| `0e89ebd`                       | Sensorliste und Auswahl für das Analyse-Panel               |
| `f6dfa00`                       | Tabs „Einzelsensor“ / „Sensorvergleich“ im Analyse-Panel    |
| `448bffa`                       | Popup mit allen Sensoren an der Klickposition               |
| `bfce880`                       | Zeitfilter: „Gesamter Zeitraum“                             |
| `20d9667`                       | Diagrammtyp-Auswahl, Balkendiagramm                         |
| `0331716`                       | Boxplot (`@sgratzl/chartjs-chart-boxplot`)                  |
| `d9e9148`                       | Windrose (Grundgerüst)                                      |
| `aac34f9`                       | Doku: Diagrammtypen, Gesamter Zeitraum                      |
| `77ef99f`                       | TOC: Info-Icon statt ⋮ (per CSS)                            |
| `dcc943e`                       | Analyse-Panel: größere Tabs, Zeitfilter darunter            |
| `80c4910`                       | Analyse-Panel klappt zu einem Icon ein                      |
| `ed1f5ef`, `d0e4c24`, `c83ad6a` | Diagrammtypen als Icons mit Tooltip                         |
| `b938ba9`                       | Doku: Designänderungen                                      |
| `d0e4c24`                       | Analyse-Panel: Tabs `lg`, keine Überschrift                 |
| `c83ad6a`                       | Analyse-Panel: Höhe 45 % der App                            |

---

## 1. Aufräumen des Starters

🟢 **Was:** Alles entfernen, was nichts mit dem Dashboard zu tun hat.

- **Entscheidung:** `src/samples/` (map-sample, i18n-howto), `src/packages/sample-package/`, `src/apps/empty/` und
  `src/sites/` gelöscht. Behalten: `docs/**` als Wissensspeicher, `support/**`, `patches/**`, Tooling-Konfiguration.
  Die Root-Seite `src/index.html` hostet direkt das Dashboard (`pnpm dev` öffnet es sofort).
- **Warum:** Die Samples zeigten, wie man etwas macht, waren aber kein Teil des Produkts. Die Docs sind als
  Nachschlagewerk weiter nützlich.
- **Stolpersteine:** Ohne Pakete unter `src/packages/` hat Typedoc nichts zu dokumentieren, deshalb flog der CI-Schritt
  `build-docs` raus. Mit dem TOC-Fork (Abschnitt 9, Branch `dashboard`) gab es wieder ein Paket und den Schritt; auf
  `toc-native` gibt es kein lokales Paket mehr und der Schritt ist wieder entfernt.
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
- **Neue Abhängigkeit:** `@sgratzl/chartjs-chart-boxplot` ^4.4.5 im Catalog (MIT, Boxplot, siehe Abschnitt 8).
  Lizenzreport und Duplikatprüfung ohne Befund.
- **Commits:** `c81b2de`, `a535bb3`, `3cff0ea`, `0331716`

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
- **Ergänzt (Demo):** DWD-Layer `RADOLAN-RW` („angeeichtes Radarkomposit“, gemessene Niederschlagssumme der letzten
  Stunde, nur Deutschland; GetFeatureInfo liefert `RW_HDF5` in mm und `TIME`). Gewählt statt der ICON-Vorhersage
  `Icon_reg025_fd_sl_TOTPREC`, die seit Modellstart aufsummiert und schwer zu deuten ist. Startete zunächst
  ausgeblendet, damit er die Temperatur nicht verdeckt. Seit 20.10. sind auf Wunsch alle Layer beim Start sichtbar
  (RADOLAN mit 30 % Transparenz). Dazu Datastream 15 (SMT100 Bodenfeuchte in %, gleicher Knoten und Standort wie
  Datastream 14).
- **Ergänzt (2026-11-13):** Datastream 16 (SMT100 Bodentemperatur, Thing „ESP32 Node Test“, liefert seit 30.10.2026).
  Ein Demo-Aufbau, etwa 800 m westlich des Knotens in Kalk. Er dient als zweite Station, gegen die der Vergleich nach
  Messgröße entwickelt wird.
- **Commits:** `6a1d0da`

## 6. Kategorien (Untergruppen) im TOC

🟢 **Was:** Layer in der JSON-Datei in Kategorien gruppieren, im TOC als Gruppen anzeigen (aktuell „WMS“ und
„Sensoren (STA)“).

- **Entscheidung:** Ein Eintrag mit `"type": "group"` hat eine eigene `layers`-Liste und darf verschachtelt werden.
  Daraus wird ein `GroupLayer`, im TOC mit `collapsibleGroups` einklappbar (beim Start zugeklappt, `initiallyCollapsed`) und als Ganzes schaltbar.
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
- **Abfrage der Messwerte** (`dataLayers/sta/sta.ts`): Zeitraum und neuester Wert bauen ihre URL mit demselben Helfer
  (`observationsQueryUrl`) und laden Seiten mit `fetchObservationPage`. Sie unterscheiden sich nur in Richtung,
  Seitengröße und Zeitraum.
    - **Sortiert und gefiltert wird nach `phenomenonTime`**, dem Zeitpunkt der Messung. Eine Observation hat in der STA
      zwei Zeiten: `phenomenonTime` (wann gemessen wurde) und `resultTime` (wann das Ergebnis entstand). Bei
      Messsensoren ist das praktisch dasselbe, bei Vorhersagen nicht (Gültigkeitszeit vs. Modelllauf). Auf unserem
      Server ist `resultTime` leer (`null`); nach ihr zu sortieren liefert eine zufällige Reihenfolge (geprüft
      2026-10-21).
    - **Mögliche Falle:** Setzt ein anderer Server oder Datenlieferant die eigentliche Zeit nur in `resultTime`, zeigen
      Diagramm und Kacheln falsche oder keine Werte. Dann ist `observationsQueryUrl` (Filter und Sortierung) und
      `parseObservation` (welche Zeit auf der x-Achse landet) anzupassen.
    - **Bewusst kein `@iot.id` als zweites Sortierkriterium:** Damit blättert FROST nicht mehr über `$skip`, sondern
      über `$skipFilter=(phenomenonTime gt <letzte Zeit der Seite>)`, auch wenn die ID im `$select` steht (geprüft
      2026-10-21). Liegen zwei Messungen mit gleicher Zeit an einer Seitengrenze, ginge die zweite verloren. Ohne
      ID blättert der Server über `$skip`; bei gleicher Zeit ist die Reihenfolge dann nicht festgelegt, verloren
      geht aber nichts systematisch.
    - **Nur die Richtung (`asc`/`desc`) ist einstellbar**, keine freie Sortierung: Für eine Zeitreihe ist nur die
      Messzeit sinnvoll, Min/Max und Statistik rechnet die App selbst. Kommt eine weitere STA-Abfrage dazu, wird der
      Schnitt neu geprüft.
- **Grenze:** Die nativen Datumsfelder formatieren nach der Browsersprache, nicht nach der App-Sprache.
- **Tabs (Branch `toc-native`):** Oben im Panel „Einzelsensor“ und „Sensorvergleich“.
    - Einzelsensor: Dropdown mit allen STA-Sensoren (auch ausgeblendeten), darunter das Diagramm.
    - Sensorvergleich: zwei Hälften nebeneinander (schmal: untereinander), jede mit eigenem Dropdown.
    - Der Zeitfilter gilt für beide Tabs, damit der Vergleich denselben Zeitraum zeigt.
    - Vorauswahl: erster Sensor bzw. erster und zweiter Sensor. Ausgewählt wird über die Layer-ID, die Daten des
      Datastreams kommen aus dem Feature des Layers (`dataLayers/sta/useStaSensors.ts`).
    - Dropdown als natives `<select>` (`NativeSelect`), damit kein Popup im Shadow DOM positioniert werden muss.
    - Nur der aktive Tab lädt Messwerte (`lazyMount`, `unmountOnExit`).
- **Sensor nicht verfügbar** (`createStaDatastreamLayer` in `dataLayers/sta/staLayer.ts`, `useSensorLoadFailed` in
  `dataLayers/sta/useStaSensors.ts`): Statt eines endlosen Spinners steht im Panel in Rot „Sensor nicht verfügbar …“.
  Das TOC markiert den Layer wie jeden anderen nicht verfügbaren Layer.
    - **Auslöser:** Das Laden des Datastreams scheitert, dauert länger als 30 s (`DATASTREAM_TIMEOUT_MS`), der
      Datastream hat keinen Standort, oder der `healthCheck` des Endpoints schlägt fehl.
    - **Mechanik:** Die Quelle des Layers durchläuft die Zustände `loading` → `ready` bzw. `error`.
      `@open-pioneer/map` leitet daraus (zusammen mit dem Health-Check) `layer.loadState` ab. Das TOC zeigt bei
      `error` von sich aus einen roten Hinweis und deaktiviert den Layer.
    - **Fehler statt reinem Zeitlimit:** Ein Fehler ist sofort bekannt. Das Zeitlimit fängt nur Anfragen ab, die nie
      antworten. Ein Zeitlimit allein würde langsame Server fälschlich als Fehler zeigen.
    - **Ohne Standort kein Sensor** (Entscheidung des Nutzers, 2026-10-21): Das Dashboard wird über die Karte
      erkundet, es geht darum, _wo_ ein Sensor steht. Ein Datastream ohne Standort wird deshalb nicht ohne
      Kartenpunkt angezeigt, sondern gilt als nicht verfügbar. So fällt der Konfigurationsfehler auf.
- **Annahmen der STA-Hooks** (`dataLayers/sta/useStaSensors.ts`):
    - **Ein Layer, ein Datastream:** Die Hooks lesen nur das erste Feature der Quelle (`datastreamFeature`). Wird
      künftig z. B. ein ganzes Thing mit mehreren Datastreams als _ein_ Layer importiert, zeigen Dropdown, Diagramm
      und Kacheln stillschweigend nur den ersten. Dann entweder pro Datastream einen eigenen Layer erzeugen
      (`createStaDatastreamLayer`) oder `datastreamFeature`, `useDatastreamProperties` und `useColocatedSensors`
      anpassen.
    - **`useDatastreamProperties` sucht die Quelle nur einmal pro Layer-ID**, nicht reaktiv. Heute unkritisch,
      weil die ID immer aus der Liste vorhandener Layer kommt (`useStaSensors`). Wird der Hook mit einer festen ID
      aufgerufen, solange die Konfiguration noch lädt, bleibt das Ergebnis `undefined`. `useColocatedSensors` ist
      über `useStaSensors` reaktiv und nicht betroffen.
- **Sensor-Popup:** Ein Klick auf einen Sensorpunkt wählt nicht mehr direkt aus, sondern zeigt ein Popup mit **allen**
  Sensoren an der Stelle. Datastream 14 und 15 liegen am selben Ort, vorher war nur der zuletzt gezeichnete
  erreichbar. Der Button „In Auswertung anzeigen“ wählt den Sensor in der Einzelansicht und öffnet das Panel.
  Der Popup-Rahmen ist mit dem FeatureInfo-Popup geteilt (`mapClick/PopupFrame.tsx`).
- **Diagrammtypen:** Linie, Balken, Boxplot, Windrose. Jede Ansicht wählt ihren Typ selbst, im Vergleich also jede
  Hälfte unabhängig, weil dort auch unterschiedliche Messgrößen nebeneinanderstehen können.
    - **Balken:** Mittelwert je Abschnitt. Die Länge richtet sich nach dem Zeitraum: bis 2 Tage je Stunde, bis 45 Tage
      je Tag, darüber je Woche (ab Montag, Ortszeit). Leere Abschnitte bleiben leer. Ob für Niederschlag später eine
      Summe statt des Mittelwerts gebraucht wird, ist offen.
    - **Boxplot:** eine Box über alle Werte des gewählten Zeitraums (Quartile, Median, Whisker 1,5 × IQR,
      Ausreißer). Chart.js kann das nicht selbst, daher das Plugin `@sgratzl/chartjs-chart-boxplot` (MIT, Chart.js-4-
      Plugin des Boxplot-Standardautors). Selbst bauen wäre ca. 100 Zeilen mehr ohne Tooltips gewesen.
    - **Windrose (Grundgerüst):** Häufigkeit je Richtung in 16 Sektoren (Nord oben mittig), Chart.js `polarArea`.
      Genutzt werden nur Daten mit Winkeleinheit (`°`, `deg`) und Werten von 0–360. Sonst bleibt die Rose leer mit
      Hinweis. Winddaten gibt es noch keine.
- **Zeitfilter „Gesamter Zeitraum“:** fragt ab 1970 ab (also alles) und zeichnet die Achse ab dem ersten Messwert.
  Das Feld „von“ bleibt dabei leer. Aktuell ca. 3.800 Werte je Datastream, weit unter der Grenze von 20.000.
- **Darstellung:** Tabs in Größe `lg`, der Zeitfilter darunter, beides linksbündig. Im Chakra-Rezept haben `sm` und
  `md` dieselbe Schrift (14px), nur `lg` ist größer (16px). Die Überschrift „Auswertung“ ist entfallen, der
  Einklapp-Button steht rechts neben den Tabs, der Bereich behält seinen Namen als `aria-label`. Höhe: 45 % der App
  (`45cqh`, die App-Wurzel ist `container-type: size`), mindestens 320px. Bezug ist also die App, nicht das
  Browserfenster. Die Diagrammtypen stehen als
  Icons (`LuChartLine`, `LuChartColumn`, `LuChartCandlestick`, `LuWind`). Lucide hat kein Boxplot-Icon, Kerzen kommen
  dem am nächsten. Der Name erscheint als Tooltip und ist `aria-label`. Der Tooltip übernimmt die Element-ID des
  Segments (`ids`), weil die Segment-Gruppe ihre Einträge über die ID findet.
- **Weitere Sensoren am Standort (Feedback, Branch `feature/colocated_sensors`):** Neben dem Diagramm stehen die
  anderen Sensoren desselben Standorts als Kacheln untereinander, in der Einzelansicht und in jeder Vergleichshälfte.
  Eine Kachel zeigt den Layernamen (lokalisiert, wie im Dropdown), den **neuesten** Wert mit Einheit und dessen
  Zeitpunkt. Ein Klick schaltet das Diagramm auf diesen Sensor um. Bewusst keine zusätzliche Linie im Diagramm.
    - **Gruppierung:** Nicht aus der Klick-Liste des Popups, sondern aus allen STA-Layern. So funktioniert sie auch bei
      Auswahl über das Dropdown, und der Auswahl-Zustand bleibt eine einzelne Layer-ID.
    - **Standard ist der Ort**, nicht das Thing: Es ist nicht sicher, dass jeder Server Stationen sauber als Things
      modelliert. Gleicher Ort heißt: Die Punktkoordinaten (EPSG:4326 aus dem GeoJSON, `position` in
      `dataLayers/sta/sta.ts`) liegen höchstens `VITE_SENSOR_GROUPING_RADIUS` Meter auseinander (Standard 1 m,
      Großkreisabstand mit `getDistance` aus `ol/sphere`). Andere Geometrien werden nie gruppiert.
    - **Abstand statt gerundeter Koordinaten:** Früher wurde der auf 6 Nachkommastellen gerundete Koordinaten-String
      verglichen. Dabei wurden leicht versetzt eingetragene Sensoren nie gruppiert, und fast gleiche Punkte fielen an
      Rundungskanten auseinander (`7.6284004` → `…400`, `7.6284006` → `…401`). Ein Abstand ist dasselbe wie ein
      Buffer um den Punkt, eine Projektion ist nicht nötig. Die Gruppierung gilt relativ zum gewählten Sensor und ist
      nicht transitiv: Liegen A–B und B–C je 0,8 m auseinander, zeigt A nur B, B zeigt A und C.
    - **Umschaltbar** über `VITE_SENSOR_GROUPING` (`location`, `thing`, `location-or-thing`,
      `dataLayers/sta/colocation.ts`). Bei Datastream 14 und 15 liefern alle drei dasselbe (gleicher Ort, Thing 2).
    - **Offen/Risiko (2026-10-30):** Die Gruppierung bleibt vorerst beim Radius von 1 m. In der Realität können die
      Sensoren einer Station mehr als 1 m auseinanderstehen (sie werden dann getrennt), und nahe Sensoren können zu
      verschiedenen Stationen gehören (sie werden dann zusammengelegt); STA-Modell und Praxis können auseinandergehen.
      Bisher gibt es nur eine Station mit zwei Sensoren. Treten solche Fälle auf, wird neu entschieden. Zurückgestellt:
      eine ausdrückliche Zuordnung von Sensoren zu Stationen in `dataLayers.json`.
    - **Neuester Wert:** eigene Abfrage `$orderby=phenomenonTime desc&$top=1`, unabhängig vom Zeitfilter. Der
      „letzte Wert“ in der Zeile über dem Diagramm ist dagegen der letzte im Zeitraum.
    - **Viele Sensoren:** Die Spalte ist so hoch wie das Diagramm und scrollt. Platz für die Scrollbar ist von Anfang
      an reserviert (`scrollbar-gutter: stable`), damit die Kacheln nicht schmaler werden, wenn sie erscheint. Unten
      blendet ein Verlauf ein, solange noch Kacheln folgen (macOS zeigt Scrollbars erst beim Scrollen). Eine Kachel ist
      ca. 78 px hoch, bei 950 px Fensterhöhe sind gut 3 sichtbar.
    - **Stolperstein:** Die Zeitstempel des STA-Servers liegen ca. 2 h in der Zukunft (vermutlich Ortszeit mit `Z`
      geschrieben). Die neuesten Werte fallen daher aus „bis jetzt“ heraus, die Kachel zeigt einen späteren Wert und
      Zeitpunkt als das Diagramm.
- **Commits:** `f71ec9a`, `0e89ebd`, `f6dfa00`, `448bffa`, `bfce880`, `20d9667`, `0331716`, `d9e9148`, `dcc943e`,
  `ed1f5ef`; Kacheln: `8e7b250`, `ca2ea99`, `dd9d284`, `00c71ae`, `0c02156`, `3a1829e`

## 9. TOC-Erweiterung und Transparenz-Slider

🔴 **Was:** Ein Transparenz-Slider für jeden WMS-Layer, direkt unter dem Layernamen im TOC.

- **Problem:** `@open-pioneer/toc` bietet keinen Prop und keine Children für eigene Inhalte pro Layer. Die
  Unterkomponenten (`LayerList`, `LayerItem`, `LayerItemMenu`) und der interne Kontext sind nicht exportiert
  (`package.json` gibt nur `"."` frei), austauschen ließe sich ohnehin nichts.
- **Betrachtete Wege:**
    1. Eigener TOC: volle Kontrolle, aber alle TOC-Funktionen nachbauen.
    2. Original-TOC über seine öffentliche API erweitern (DOM-Element des Eintrags + React-Portal).
    3. Slider-Bereich unter dem TOC: robust, aber nicht beim jeweiligen Layer.
    4. TOC forken und um einen Slot erweitern.
    5. `pnpm patch` auf das kompilierte Paket (Mechanismus im Repo vorhanden, siehe [WaysToPatchAPackage.md](./WaysToPatchAPackage.md)).
    6. Slot-Prop als Pull Request upstream vorschlagen.
- **Erste Lösung (Branch `dashboard`): Fork.** `src/packages/toc` (`@cosite/toc`) aus dem Upstream-Tag
  `@open-pioneer/toc@1.5.0` mit neuem Prop. Erst als Schnittstelle im ⋮-Menü (`layerMenuContent`), dort wurde der
  Slider übersehen, dann `layerItemContent(layer)` direkt unter dem Titel.
  Commits: `cb6feb5`, `58c94ff`, `5c52ad7`.
- **Neubewertung:** Der Fork kopierte ~20 Dateien für ~50 geänderte Zeilen und muss bei jedem Upstream-Update von Hand
  abgeglichen werden. Vorgabe danach: kein Fork, kein Patch, kein PR, die bestehende Komponente soll erweitert werden.
  Weg 2 war beim Fork übersehen worden, weil nur Props und Unterkomponenten geprüft wurden, nicht die imperative API.
- **Aktuelle Lösung (Branch `toc-native`): Erweiterung über die öffentliche API** (`toc/TocItemExtensions.tsx`):
    - `Toc` liefert in `onReady` eine `TocApi`. `api.getItems()` liefert alle Einträge, jeder `TocItem` hat
      `htmlElement`, das DOM-Element des Eintrags. Beides ist dokumentiert und **reaktiv** (`reactive()` bzw.
      `reactiveMap`), Neu-Rendern und Entfernen von Einträgen werden also gemeldet.
    - Angehängt wird ein eigenes `<div class="toc-layer-item-extra">` als letztes Kind von
      `<li class="toc-layer-item layer-<id>">`. Der Slider wird per `createPortal` hineingerendert und bleibt damit Teil
      des React-Baums der App (Chakra, i18n, Zustand).
    - Im Browser geprüft: genau ein Slider, am Titel ausgerichtet, funktioniert nach Gruppe ein/aus, Sprachwechsel,
      TOC-Panel ein/aus und Layer an/aus.
- **Risiken der aktuellen Lösung:**
    - Ein fremdes Element in einem Bereich, den der TOC selbst rendert. React lässt unbekannte Kinder in Ruhe, es ist
      aber nicht der vorgesehene Zweck von `htmlElement` (die TOC-Doku nennt „z. B. zum Scrollen“).
    - Inhalt nur am Ende des Eintrags: bei WMS-Layern (Sublayer ausgeblendet) direkt unter dem Titel, bei Gruppen
      stünde er unter den Kindern. Fügt der TOC einem Eintrag später neue Kinder hinzu, landen sie hinter dem Container.
    - Ändert Upstream das Markup, kann der Slider anders sitzen. Die API selbst ist öffentlich.
- **Info-Icon statt ⋮:** Der ⋮-Button des TOC öffnet nur die Beschreibung, soll daher wie ⓘ aussehen. Der TOC rendert
  das Icon fest, ohne Prop. Deshalb wird es per CSS ersetzt (`toc/TocPanel.tsx`): Das SVG im Button
  `.toc-layer-item-details-button` wird ausgeblendet, an seiner Stelle zeichnet ein `::before` das Lucide-Icon „info“
  als Maske in der Textfarbe des Buttons. Die Regel gilt nur innerhalb des TOC, nicht für das ✕ im Popover (Portal).
  Risiko: Die Klasse ist laut TOC-README nicht garantiert. Fällt sie weg, erscheint wieder ⋮, es geht nichts kaputt.
  Commit: `77ef99f`.
- **Ausführliche Begründung** für die Team-Diskussion: [TocExtensionDecision.md](./TocExtensionDecision.md).
- **Status:** Entschieden für `toc-native` (Erweiterung über die öffentliche API, kein Fork). Nach `main` gemergt.
  `dashboard` mit dem Fork bleibt als Referenz bestehen, wird aber nicht weiterentwickelt.
- **Commits (`toc-native`):** `22b279a`, `9dc52cb`

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
- **Analyse-Panel genauso:** Eingeklappt verschwindet das Analyse-Panel unten ganz, unten links über der Karte bleibt
  ein Liniendiagramm-Button (`LuChartLine`) zum Öffnen. Die Karte wird dabei höher. Gleiche Fokusführung wie beim TOC.
- **Commits:** `237a773`, `80c4910`

## 12. WMS-Legende

🔴 **Was:** Die Legende des WMS-Layers im FeatureInfo-Popup. Legenden waren der aufwendigste Teil.

- **Stolperstein 1, Upstream-Fehler:** `@open-pioneer/map` 1.5.0 fragt die Capabilities fest mit `LANGUAGE=ger` an
  (`WMSLayer.js`). Der DWD-GeoServer antwortet darauf mit einem Fehler („no international content defined“). Die Karte
  ignoriert das stillschweigend: Der Layer gilt als geladen, aber es gibt keine Legenden-URL.
- **Lösung:** Fehlt die URL aus den Capabilities, baut die App eine Standard-Anfrage
  `{endpoint}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER={name}`
  (`getLegendGraphicUrl` in `mapClick/legendUrls.ts`). Bei Servern mit funktionierenden Capabilities wird deren URL genommen.
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
- **Ausgewählter Sensor:** Ein Klick auf einen Sensorpunkt markiert ihn mit einem blauen Ring, das Popup sitzt am
  Sensor statt an der Klickposition. Der nächste Klick in die Karte (oder ✕ im Popup) hebt die Markierung auf.
  „In Auswertung anzeigen“ schließt nur das Popup, der Sensor bleibt markiert, solange er im Panel gezeigt wird.
- **Commits:** `0cf7594`, `74b09ed`, `2fc058c`

## 14. Testen

🟢 **Was:** Wie die Änderungen geprüft wurden.

- **Vitest** (`pnpm vitest run`): Parser der Konfiguration inkl. Gruppen, Mehrsprachigkeit, FeatureInfo- und
  Legenden-Optionen; Zeitfilter; Lücken im Diagramm; Legenden-URL; Popup-Platzierung.
- **Im Browser:** Jede UI-Änderung wurde mit Headless-Chromium gegen `pnpm preview` geprüft, gesteuert über das Chrome
  DevTools Protocol (Klicks, Screenshots, Netzwerk-Requests, Konsolenfehler). Die Skripte liegen nicht im Repo.
- **CI-relevant:** `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm build-docs`, `pnpm build-license-report`.

## 15. Offene Punkte und Ideen

- **Upstream-Issue:** Fest eingebautes `LANGUAGE=ger` in `@open-pioneer/map` melden (dazu: eine Endpoint-URL mit
  `?` ergibt eine kaputte Capabilities-URL). Wird es behoben, nutzt die App automatisch die Legenden-URLs aus den
  Capabilities. Für eigene WMS umgeht die App das schon (Abschnitt 17).
- **Eigene WMS ausbauen:** FeatureInfo für Dienste ohne GeoJSON (GML über `ol/format/WMSGetFeatureInfo`; HTML nur
  bereinigt), Style-Auswahl (z. B. barrierefreier RADOLAN-Style), Zeitdimension, Zoom auf die Ausdehnung des Layers.
- **Weitere Diagramme:** Linie, Balken, Boxplot und Windrose gibt es (Abschnitt 8). Weitere nach Bedarf.
- **CI-Deploy:** Der Job `deploy` in `.github/workflows/test-and-build.yml` ist noch an das Repository
  `open-pioneer/trails-starter` gebunden (`github.repository == …`) und läuft daher auch in `Co-Site/cosite-dashboard`
  nie. Build und Tests laufen dort bei jedem Push. Ob ein Deploy auf GitHub Pages gewünscht ist, ist offen.
- **Daten:** Umgang mit Sensor-Ausreißern (z. B. `0`-Werte) fachlich klären. Zeitstempel des STA-Servers ca. 2 h in
  der Zukunft (siehe Abschnitt 8, Kacheln), beim Betreiber klären. Bei weiteren STA-Servern prüfen, ob die Messzeit
  in `phenomenonTime` steht und nicht nur in `resultTime` (Abschnitt 8, Abfrage der Messwerte).
- **Überlagerte Sensorpunkte:** Sensoren am selben Ort sind auf der Karte ein Punkt. Das Popup listet sie, im Panel
  stehen sie als Kacheln neben dem Diagramm. Eine Darstellung auf der Karte (z. B. Gruppierung oder Versatz) steht
  noch aus.
- **Ganzes Thing als Layer:** Gut möglich, dass einmal ein Thing mit allen Datastreams importiert wird. Dann die
  Annahme „ein Layer, ein Datastream“ beachten (Abschnitt 8, Annahmen der STA-Hooks).
- **Windrose fachlich klären:** Welche Datastreams (Richtung, Geschwindigkeit), Geschwindigkeitsklassen gestapelt pro
  Sektor, Anzahl der Sektoren. Für gestapelte Klassen reicht `polarArea` nicht, dann eigene Zeichnung oder Plugin.
- **Balken für Niederschlag:** Summe statt Mittelwert je Abschnitt, ggf. pro Datastream in der Konfiguration.

## 16. Branches und Arbeitsweise

**Was:** Wie ab dem Merge von `toc-native` nach `main` entwickelt wird.

| Branch       | Rolle                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `main`       | Stabiler Stand. Bekommt nur Merges aus `dev`.                           |
| `dev`        | Integrationsstand. Bekommt Merges aus Feature-Branches.                 |
| `<feature>`  | Ein Branch pro Feature, abgezweigt von `dev`, z. B. `feature/windrose`. |
| `toc-native` | Gewählte TOC-Variante, nach `main` gemergt. Bleibt als Historie.        |
| `dashboard`  | TOC-Fork-Variante. Nicht gemergt, bleibt nur als Referenz.              |

- **Ablauf:** Feature-Branch von `dev` → ein Commit pro Schritt → `git merge --no-ff <feature>` nach `dev` → wenn
  `dev` stabil ist, `git merge --no-ff dev` nach `main`. `--no-ff`, damit jedes Feature als Merge-Commit sichtbar
  bleibt. Danach `dev` mit `git merge --ff-only main` auf `main` nachziehen, damit beide auf demselben Commit stehen
  (der Merge-Commit entsteht sonst nur auf `main`).
- **Nachziehen:** Einen Feature-Branch vor dem Merge auf das aktuelle `dev` zu rebasen ist in Ordnung (er ist noch
  nicht geteilt). Kommt etwas direkt auf `main` (Hotfix), wird `main` in `dev` **gemergt**, nicht rebased: Ein Rebase
  würde die Commits von `dev` neu schreiben und passt dann nicht mehr zu den schon gemergten Feature-Branches.
- **Remotes:**
    - `origin` = `git@github.com:Co-Site/cosite-dashboard.git`, das eigene Repo. `main` und `dev` werden dorthin
      gepusht, Feature-Branches nur bei Bedarf.
    - `upstream` = `open-pioneer/trails-starter`, nur zum Abholen. Push ist deaktiviert (`git remote set-url --push
upstream no-push`). Updates vom Starter bei Bedarf mit `git fetch upstream` holen und in einem Feature-Branch
      mergen.
    - `toc-native` und `dashboard` liegen nur lokal.

## 17. Eigene WMS-Layer (temporär)

🔴 **Was:** Kundenwunsch: WMS-Layer für die aktuelle Sitzung hinzufügen, ohne etwas zu speichern, mit möglichst
wenig Eingaben (höchstens ein Titel, nicht mehrere Textfelder).

- **Entscheidung:** Ein Formular unter dem TOC-Titel mit zwei Feldern: URL des Dienstes, dann ein Suchfeld mit
  Vorschlägen für den Layer. Der Titel kommt aus den Capabilities, getippt wird er nie.
- **Warum Suchfeld statt Layername-Feld:** Technische Namen wie `Icon_reg025_fd_sl_T2M` kennt kaum jemand. Die
  Capabilities müssen ohnehin geladen werden (Titel, FeatureInfo-Format, Fehlermeldungen), die Suche ist nur die
  Oberfläche darüber. Profis tippen den exakten Namen und drücken Enter.
- **Liste statt nur Suche (Nachbesserung):** Zuerst zeigte die Liste nur Suchtreffer (höchstens 30). Wunsch des
  Nutzers: auch ohne Suchbegriff blättern können. Jetzt stehen ohne Eingabe alle Layer in Dokumentreihenfolge in
  einer scrollbaren Liste (`min(22rem, 40vh)` hoch), die Suche filtert sie nur. Kein Baum: DWD hat 206 Layer (ca.
  1 MB Capabilities), der Pfad (übergeordnete Titel) steht klein unter jedem Eintrag. Benannte Gruppenlayer (z. B.
  „Fachlayer“) erscheinen mit, sie zeigen beim Hinzufügen alle ihre Unterlayer.
- **Was die Capabilities liefern** (geprüft an DWD, BKG TopPlusOpen, NRW DOP, BGR BÜK200, BfN, LANUV):
    - Ja: Layerliste, Titel, `queryable`, GetFeatureInfo-Formate, Legenden-URL, CRS, Zeitdimension, Ausdehnung.
    - Teilweise: Abstract (oft leer oder gleich dem Titel), Anbieter, Nutzungsbedingungen.
    - Nein: englische Texte (kein Dienst ist mehrsprachig, DWD antwortet auf jedes `LANGUAGE` mit einem Fehler), brauchbare
      Attribution (bei keinem Dienst vorhanden, nur langer Freitext in `Fees`/`AccessConstraints`), Feldlabels
      (nur rohe Namen wie `RW_HDF5`), verlässliche Einheiten.
    - Folge für die Konfiguration: `name` ist bei WMS optional (Titel aus den Capabilities), `featureInfo.format`
      neu. Gepflegte Texte auf Deutsch und Englisch, Attribution, Feldlabels und Legendenparameter bleiben manuell.
- **Wo die Layer landen:** Gewünscht war die bestehende Gruppe „WMS“. Geht nicht: Gruppen in
  `@open-pioneer/map` 1.5.0 haben ein festes Kinder-Array (`GroupLayerCollection`), und ein Layer verlässt eine
  Gruppe nur, wenn sie zerstört wird (mitsamt Kindern). Die WMS-Gruppe neu zu bauen hätte den Zustand der
  konfigurierten Layer zurückgesetzt. Stattdessen eigene Gruppe „Eigene WMS“ direkt darunter, die bei jeder Änderung
  neu gebaut wird; Sichtbarkeit und Deckkraft der eigenen Layer werden übernommen, sie laden dabei kurz neu.
- **FeatureInfo:** Bisher war `INFO_FORMAT=application/json` fest eingebaut. Das kann nur GeoServer; ArcGIS und
  MapServer liefern `application/geo+json`, manche Dienste gar kein JSON (4 von 5 getesteten fremden Diensten wären
  gescheitert). Jetzt wird das Format aus den Capabilities gewählt, ohne passendes Format wird der Layer nicht
  abgefragt (statt bei jedem Klick „Anfrage fehlgeschlagen“).
- **Attribution:** `@open-pioneer/map` setzt ohne eigene Attribution `AccessConstraints` oder `Fees` als
  Quellenangabe (DWD: nackte URL, BfN: „Nicht für Planungszwecke geeignet“). Die App setzt sie jetzt immer selbst
  (leer, wenn nicht konfiguriert). Anbieter und Nutzungsbedingungen eigener Layer stehen in der Layerbeschreibung.
- **Stolpersteine:**
    - `ol/format/WMSCapabilities` vererbt CRS nur über eine Ebene (die Zwischenebene wird erst nach ihren Kindern
      ergänzt). Bei DWD stehen die CRS nur an der Wurzel, die Layer liegen drei Ebenen tiefer. Die App vererbt die
      CRS deshalb selbst.
    - Der XML-Parser von happy-dom (Tests) bricht das DWD-Dokument nach 74 Layern ab, im Browser sind es alle 206.
      Die Unit-Tests nutzen ein kleines Beispieldokument.
    - Die Legenden-URL der Capabilities wird nur für eigene Layer genutzt: Bei DWD enthält sie schon
      `width=20&height=20`, die konfigurierten Legendenparameter (`WIDTH=12`) kamen zusätzlich dazu. Parameter werden
      jetzt unabhängig von Groß-/Kleinschreibung ersetzt, Legendenbilder mit Ladefehler ausgeblendet (BGR liefert eine
      Legenden-URL mit `%26` statt `&`).
    - Dienste ohne CORS lassen sich nicht hinzufügen (Fehlermeldung im Formular, kein Proxy).
    - **DWD-Gruppen mit Namen sind nicht abrufbar:** 16 Ordnergruppen (Fachlayer, Wetter, Radar, Satellit, Warnungen,
      Klima, Basislayer, …) haben in den Capabilities einen `<Name>`, GetMap antwortet aber mit HTTP 200 und
      `ServiceException code="LayerNotDefined"` (auch mit `dwd:`-Präfix und über `/geoserver/wms`). Nach WMS 1.3.0
      §7.2.4.6.3 hat ein Layer genau dann einen Namen, wenn er abrufbar ist; das ist also ein Fehler beim DWD
      (vermutlich Konfiguration der Layergruppen in GeoServer). Folge in der App war ein leerer Layer und nur
      „Image load error“ in der Konsole.
    - **Rückmeldung an den Nutzer** (deshalb, und für ausgefallene Dienste):
        - Vor dem Hinzufügen fragt die App ein 1 × 1-Pixel-Bild ab (`probeWmsLayer`). Nur eine Bild-Antwort zählt;
          sonst erscheint die Meldung des Dienstes im Formular und nichts wird hinzugefügt. Gruppen sind in der Liste
          markiert.
        - Im TOC zeigt jeder WMS-Layer (auch konfigurierte) einen Hinweis, solange sein Kartenbild nicht lädt
          (`toc/LayerLoadWarning.tsx`, Ereignisse `imageloaderror`/`imageloadend` der OpenLayers-Quelle). Der
          `loadState` des Layers hilft nicht, `@open-pioneer/map` setzt ihn nur bei Fehlern der Initialisierung.
        - Stolperstein: Bei HTTP-Fehlern (z. B. 500) loggt `@open-pioneer/map` nur und lässt das Bild unvollendet,
          OpenLayers meldet dann nichts. Die App umhüllt die Ladefunktion der Quelle und lässt ein solches Bild
          scheitern (`reportFailedImageRequests` in `ows/wmsLayer.ts`).
- **Offen:** siehe Abschnitt 15 (GML-FeatureInfo, Styles, Zeitdimension, Zoom auf den Layer).
- **Commits:** `fd05554`, `2b15b8b`, `ac864aa`, `ba0a99a`, `d5ca6bb`; Rückmeldung: `20f6df2`, `ba62eac`

## 18. Geoportal Leverkusen (Proxy)

🟡 **Was:** Kundenwunsch: die wichtigsten Layer aus dem Geoportal Leverkusen (Thema „Natur, Umwelt und Mobilität“)
standardmäßig sichtbar: Stadtklimaprojektionen, Hochwasser, Starkregen, Grundwassernutzungsverbot.

- **Dienst:** `https://geoportal.leverkusen.de/GCGisService` (GC OSIRIS auf GeoServer, WMS 1.1.1/1.3.0, öffentlich,
  EPSG:3857, GetFeatureInfo als `application/json`). Gefunden über die Netzwerk-Requests des Geoportals; die
  Themen-Links auf leverkusen.de/service/geoportal enthalten die Layernamen.
- **Namensabgleich** (Capabilities vom 2026-10-26):
    - Stadtklima: `LEV:Heisse_Tage_…`, `LEV:Sommertage_…`, `LEV:Tropennaechte_…` je für `1971_bis_2000`,
      `2031_bis_2060`, `2071_bis_2100`. Alle drei Zeiträume aufgenommen, je Indikator ein Eintrag mit drei Unterlayern.
    - Hochwasser: `LEV:hw_<gewässer>_<ueg|gg>_hq_<10|100|extrem>` (`ueg` Überschwemmungsgebiet, `gg` geschütztes
      Gebiet, `hq_10` = „HQ häufig“). Je Gewässer (Dhünn, Mutzbach, Rhein, Wiembach) ein Eintrag mit allen vorhandenen
      Kombinationen. Die Wupper gibt es auch, sie stand nicht auf der Kundenliste und fehlt bewusst.
    - Starkregen: `LEV:Starkregen_T50`, `LEV:Starkregen_T100`, `LEV:Starkregen_hN90mm` (Blockregen 90 mm, das „sehr
      seltene Ereignis“).
    - Grundwasser: `LEV:Grundwassernutzungsverbot GL` (diesen nutzt das Geoportal).
- **Kein CORS:** Der Dienst sendet keinen `Access-Control-Allow-Origin` (DWD sendet `*`). `@open-pioneer/map` lädt
  Bilder und Capabilities per `fetch`, also blieben die Layer leer, lokal wie produktiv.
- **Entscheidung: Proxy auf dem eigenen Server.** Verworfen:
    - Bilder per `<img>` laden: ginge ohne CORS, aber ohne Capabilities, FeatureInfo und Legende (die Legende steht nur
      im FeatureInfo-Popup), Unterlayer nur mit technischen Namen, Canvas „tainted“.
    - Stadt um CORS bitten: richtig, aber Zeitpunkt offen. Setzt die Stadt den Header, kann der Proxy entfallen
      (Endpoint wieder absolut).
- **Umsetzung:** Relative Endpoints werden gegen die App-URL aufgelöst, Vite leitet `/proxy/leverkusen/` weiter,
  produktiv braucht nginx denselben Pfad (Beispiel in `DashboardWiring.md`). Mehrere Layer pro Eintrag (ein GetMap
  statt 31), die Unterlayer-Titel kommen aus den Capabilities.
- **Stolpersteine:**
    - GetLegendGraphic der Stadtklima-Layer antwortet mit einer `NullPointerException`; die `*_dummy`-Layer, die das
      Geoportal dafür nutzt, liefern leere Bilder. Legende für Stadtklima deshalb aus.
    - Die drei Zeiträume eines Indikators decken jeweils die ganze Stadt ab. Sind alle sichtbar, sieht man nur den
      obersten (2071–2100). Noch offen.
- **Commits:** `a32bf8e`, `2e4777f`, `2bf530b`, `1d735c6`

## 19. Eigene WFS-Layer

🟡 **Was:** Wie bei WMS (Abschnitt 17) sollen WFS-Dienste für die Sitzung hinzugefügt und dauerhaft in
`dataLayers.json` eingetragen werden können (`TODO.md`, besprochen am 2026-10-30).

- **Entscheidung:** Eigene Zeile „WFS hinzufügen“ unter „WMS hinzufügen“ mit demselben Ablauf (URL laden, Feature-Typ
  suchen, hinzufügen). WFS 2.0.0 und 1.1.0, GeoJSON und GML (3.2, 3.1, 2) gleich von Anfang an. Gruppe „Eigene WFS“
  (`user-wfs`) über dem obersten Layer mit WMS, also über den Kartenbildern und unter den Sensoren. Eine Farbe pro
  Layer aus einer festen Palette (`dataLayers/ows/wfsStyle.ts`), kein Style-Picker. Beim Kartenklick stehen die Attribute
  im vorhandenen Popup vor den WMS-Ergebnissen, das Feature wird hervorgehoben. Kein allgemeiner Proxy.
- **Gemeinsam mit WMS statt kopiert:** Session-Gruppe (`dataLayers/userLayers.ts`), Laden der Capabilities
  (`toc/useServiceCapabilities.ts`), Suche (`toc/LayerSearch.tsx`) und Formular
  (`toc/AddServiceLayer.tsx`) sind generisch. Was je Diensttyp anders ist, beschreibt `toc/userServices.ts`
  (Capabilities, Einträge, Prüfung, Config). URL-Normalisierung, der Fehler „nicht erreichbar“, Session-Cache,
  Exception-Meldungen und die Beschreibung eigener Layer liegen in `dataLayers/ows/owsService.ts`. Texte: gemeinsame unter `addService.*`, typspezifische unter `addWms.*` und
  `addWfs.*`. Der Titel aus den Capabilities (`applyCapabilitiesTitle`) und `FeatureInfoConfig` gelten für beide.
- **Capabilities:** OpenLayers hat keinen Parser für WFS-Capabilities (`ol/format/WFS` liest nur GetFeature-Antworten).
  Eigener Parser in `dataLayers/ows/wfsCapabilities.ts`, der Elemente nur über den lokalen Namen liest, weil sich die
  Präfixe je Server unterscheiden. Ausgabeformate stehen je Feature-Typ (deegree) oder nur an `GetFeature` in
  `OperationsMetadata` (GeoServer). Gefragt wird mit `ACCEPTVERSIONS=2.0.0,1.1.0`, der Dienst antwortet mit der neuesten
  Version, die er kann (Hamburg, DWD und NRW antworten mit 2.0.0).
- **KBS (Abweichung vom Plan):** Geplant war EPSG:3857, dann 4326, dann 25832/25833. Gewählt werden jetzt nur
  projizierte Systeme: 3857, 25832, 25833. Listet ein Feature-Typ keins davon, wird trotzdem 3857 angefragt.
    - Warum: Bei EPSG:4326 hängt die Achsenreihenfolge (Lat/Lon oder Lon/Lat) von Server, Version und Schreibweise ab.
      Ein Fehler legt die Features ohne jede Meldung an die falsche Stelle. Projizierte Systeme sind immer Rechts-/Hochwert.
    - DWD listet nur EPSG:4258, liefert auf Anfrage aber 3857. Dienste, die das nicht können, fängt die Prüfung vor
      dem Hinzufügen ab.
- **Laden:** `bbox`-Strategie (nur der Kartenausschnitt), höchstens `maxFeatures` (Standard 1000) pro Anfrage. Liefert
  eine Anfrage genau so viele Features, zeigt das TOC „Nicht alle Features geladen“. Ein Exception-Report mit HTTP 200
  zählt als Fehler, das TOC warnt dann wie beim WMS (`featuresloaderror`, `toc/LayerLoadWarning.tsx`).
- **Prüfung vor dem Hinzufügen:** GetFeature mit einem Feature im gewählten Format und KBS (`probeWfsFeatureType`).
  Nur eine FeatureCollection zählt. Feature-Typen ohne GeoJSON- und GML-Ausgabe werden mit Meldung abgelehnt.
- **Stolpersteine:**
    - deegree (Hamburg) lässt bei leerem Ergebnis `features` im GeoJSON weg (`{"type":"FeatureCollection"}`), daran
      bricht `ol/format/GeoJSON` ab. Die App liest das JSON vorher selbst.
    - Nach einem Fehler ließ `removeLoadedExtent` den Ausschnitt sofort neu laden: eine Anfrage-Schleife. Ein
      fehlgeschlagener Ausschnitt gilt jetzt als geladen und wird erst bei einem neuen Ausschnitt wieder angefragt.
    - happy-dom (Tests) kennt `lookupNamespaceURI` nicht und keine XML-Deklaration mit einfachen Anführungszeichen. Der
      Namespace des Feature-Typs (für GML) wird deshalb über die `xmlns:`-Attribute selbst gesucht.
- **Im Browser geprüft:** Hamburg Verwaltungsgrenzen (deegree; 2.0 mit GeoJSON und 1.1 mit GML 3.1.1 deckungsgleich),
  DWD GeoServer (61 Feature-Typen, Hinzufügen und Entfernen, Obergrenze), Leverkusen direkt (ohne CORS:
  Fehlermeldung), ein falscher Feature-Typ (Ladewarnung). „WMS hinzufügen“ nach dem Umbau unverändert.
- **Aufräumen vor dem Merge** (Grilling am 2026-10-30, Maßstab: einfach, wo es einfach sein kann, genau bei KBS/Achsen,
  Formaterkennung und Config-Prüfung):
    - Ordner: `dataLayers/config/` (Schema, Laden, Texte), `ows/` (WMS, WFS), `sta/` (SensorThings). Die Erzeugung
      pro Typ liegt im Ordner (`ows/wmsLayer.ts`, `ows/wfsLayer.ts`, `sta/staLayer.ts`), `createDataLayer.ts` verteilt
      nur noch. Was alle teilen, steht in `dataLayerBase.ts`, sonst entstünden Import-Zyklen zwischen den Ordnern.
      `userLayers.ts` bleibt oben als allgemeiner Baustein (kann später auch andere Diensttypen aufnehmen).
    - Vereinfacht: Session-Gruppen ohne Generics (eine Klasse, zwei `switch`), GetFeature aus einem Settings-Objekt
      (`resolveWfsRequest` liefert `undefined` statt zu werfen), Prüfungen liefern nur die Meldung des Dienstes, nur
      noch „nicht erreichbar“ als eigene Fehlerklasse, eine Anfrage mit `ACCEPTVERSIONS` statt einer pro Version,
      ein Hook für die Ladewarnung, ungenutzte Felder und Exports und triviale Tests entfernt.
    - Bewusst behalten: `wfs.version` und `wfs.outputFormat` in der Config (Grundsatz Config vor Dienst), Style je
      Geometrietyp und Farbe aus der Layer-ID.
- **Offen:** Paging statt fester Obergrenze, Style-Picker, Legende. Ein dauerhafter WFS-Layer ist in
  `dataLayers.json` noch nicht eingetragen.
- **Commits:** `96b332d`, `e83aab9`, `9e60605`, `abad3d4`, `cd69e8e`, `c532ca8`, `c3a701b`, `ca342b2`; Doku: `3113d55`; Aufräumen: `5996bac`, `8591894`, `4040c3c`, `3da326f`, `27cd718`, `387c7c3`,
  `5f30255`, `971d8d2`, `e9b51ed`, `e4cdc46`, `f882a36`

## 20. Messgrößenvergleich

🟡 **Was:** Ein dritter Tab im Analyse-Panel vergleicht alle Sensoren einer Messgröße in einem Diagramm
(`TODO.md`, Grilling am 2026-11-13). Grundlage ist der Key `observedProperty` am Sensor (siehe Überblick).

- **Auswahl:** Zur Wahl stehen nur Messgrößen, die mindestens zwei konfigurierte Sensoren tragen, in der Reihenfolge
  der Konfiguration; die erste ist vorgewählt. Im TOC ausgeblendete Layer zählen mit. Gibt es keine solche
  Messgröße, bleibt der Tab sichtbar und zeigt einen Hinweis.
- **Name der Messgröße:** Übersetzung aus den i18n-Dateien der App (`observedProperty.<key>`), sonst der rohe Key.
  Eine neue Messgröße braucht für einen schönen Namen also einen Eintrag in `i18n/de.yaml` und `en.yaml` (und einen
  Neubau). Verworfen: ein Namensfeld in `dataLayers.json`.
- **Reihen:** Eine Linie je Sensor, beschriftet mit dem Layernamen aus der Konfiguration (vorläufig). Achse und
  Tooltip nutzen die Einheit des ersten Sensors; geprüft wird nichts (Grundsatz „Die Konfiguration ist
  verantwortlich“, bisher gibt es nur °C).
- **Kacheln statt Legende:** Die Sensoren stehen wie im Einzel-Tab als Kacheln mit neuestem Wert neben dem Diagramm,
  der Rand hat die Farbe der Linie. Ein Klick blendet die Reihe aus oder ein, anfangs sind alle an. Gemerkt werden
  die ausgeblendeten Sensoren, damit neue von selbst erscheinen; die Auswahl übersteht den Tab-Wechsel.
- **Laden:** Jeder Sensor lädt einzeln und parallel (max. 20.000 Werte je Sensor). Ein Fehler betrifft nur seine
  Kachel („nicht verfügbar“). Geladen werden auch ausgeblendete Sensoren, damit das Einblenden sofort wirkt.
- **Weggelassen:** die Zeile mit Anzahl, Min, Max und letztem Wert; der Hinweis auf abgeschnittene Daten bei mehr
  als 20.000 Werten.
- **Nur Linie:** Balken und Boxplot für mehrere Reihen kommen später (`TODO.md`), die Windrose entfällt im Vergleich.
- **Farben:** Linien und Kachelränder haben die Farbe der Station des Sensors (Abschnitt 21).
- **Im Browser geprüft:** Datastream 14 und 16 als zwei Linien, Tooltip, Ausblenden über die Kachel, Tab-Wechsel,
  Sprachwechsel.

## 21. Stationsfarben

🟡 **Was:** Jede Station hat eine Farbe, die sich durch die ganze App zieht (Grilling am 2026-11-13). So erkennt
man im TOC, auf der Karte und in den Diagrammen, welche Sensoren zusammengehören.

- **Station:** Sensoren am selben Standort nach der bestehenden Gruppierung (`VITE_SENSOR_GROUPING`, Radius 1 m).
  Ein Sensor ohne Nachbarn ist eine Station mit einem Sensor und bekommt ebenfalls eine eigene Farbe, sonst wären
  zwei einzelne Sensoren im Vergleich nicht zu unterscheiden.
- **Vergabe:** In der Reihenfolge der Konfiguration, aus einer festen Palette mit 20 Farben (es wird nicht viele
  Stationen geben); danach wiederholen sie sich. Die Farbe steht nicht in `dataLayers.json`.
- **Wo:** Sensorpunkt auf der Karte (vorher alle orange), Punkt vor dem Sensor im TOC, Rand der Kacheln, Linien,
  Balken, Boxen und Windrose in allen drei Tabs (vorher festes Blau).
- **Palette:** Die ersten acht Farben sind die bisherige Diagrammpalette. Geprüft mit dem Validator des
  dataviz-Skills: Benachbarte Farben der Liste bleiben auch bei Farbfehlsichtigkeit unterscheidbar, weit
  auseinanderliegende können sich ähneln. Bei 20 Farben geht es nicht besser.
- **Bewusst nicht behandelt:** Ketten (A–B und B–C nah, A–C nicht): Ein Sensor kommt zur ersten Station, deren
  erster Sensor am selben Standort liegt. Zwei Sensoren derselben Station mit derselben Messgröße hätten im
  Vergleich dieselbe Linienfarbe. Beides kommt laut Nutzer nicht vor.
- **Eigenheit:** Die Station ergibt sich aus dem Standort, und den kennt die App erst, wenn der Datastream geladen
  ist. Die Farben erscheinen also mit den Sensoren; lädt ein früherer Sensor später als ein späterer, kann eine
  Farbe beim Start einmal wechseln. Ein Sensor, der nicht lädt, hat keine Farbe.
- **TOC-Punkt:** Das TOC erlaubt Inhalt nur unter der Titelzeile (`TocItemExtensions`). Der Punkt wird mit negativen
  Abständen in die Zeile gezogen, an den freien Platz des Aufklapp-Pfeils. Bei mehrzeiligen Titeln sitzt er dadurch
  etwas unter der Mitte der Zeile.
- **Im Browser geprüft:** Datastream 14 und 15 (Köln-Kalk) blau, Datastream 16 (Demo-Knoten) orange, jeweils auf der
  Karte, im TOC, an den Kacheln und in den Liniendiagrammen aller drei Tabs.
