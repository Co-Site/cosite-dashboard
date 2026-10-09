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

## Lokale Pakete (für später)

- Neues Paket unter `src/packages/<name>/` mit eigener `package.json` (+ `build.config.mjs`, falls Services/i18n/Styles).
- In der App einbinden: `"<name>": "workspace:*"` in der App-`package.json`, `pnpm install`.
- `typedoc.config.mjs` dokumentiert alle Pakete unter `src/packages/**`. Der CI-Step `pnpm build-docs`
  wurde entfernt, solange es keine lokalen Pakete gibt – danach wieder in `.github/workflows/test-and-build.yml` aufnehmen.

## Tests

- Vitest mit `happy-dom`, Setup in `src/testing/global-setup.ts`; Testdateien `*.test.ts(x)` neben dem Code.
- Siehe [How to write tests](./tutorials/HowToWriteTests.md).
