# Trails-Starter → Projekt

> **Status: Entwurf zur Diskussion.** Deutsche Fassung von [`SKILL.md`](./SKILL.md). Maßgeblich ist `SKILL.md`
> (Englisch, mit Skill-Frontmatter, wird später von Claude benutzt). Änderungen immer in beiden Dateien nachziehen.
> Abgeleitet aus dem Aufbau des COSITE-Dashboards (`docs/DashboardDecisions.md` §1–3, §16,
> Branch `feature/adjust_commit_hook`).

## Ziel

Der [Trails-Starter](https://github.com/open-pioneer/trails-starter) ist eine Mischung aus How-to und Demonstrator:
Beispiel-Apps, ein Beispielpaket, eine leere App, Demo-Sites, eine CI, die die Trails-Demo deployt und die Automatisierung
des Trails-Teams aufruft. Dieser Skill macht aus einem frischen Klon ein **Blanko-Projekt**:

- **Eine App** `src/apps/<app-name>` mit Kartenservice (`map.MapConfigProvider`), OpenStreetMap als Basiskarte und den
  Buttons _Startansicht_, _Hineinzoomen_, _Herauszoomen_. Sonst nichts.
- Die Root-Seite `src/index.html` zeigt die App im Vollbild, `pnpm dev` öffnet sie direkt.
- **Entfernt:** Samples, Beispielpaket, leere App, Sites, alles, was nur der Entwicklung von Trails selbst dient
  (API-Doku-Schritt und Trails-Demo-Deploy in der CI, Trails-Repo-Automatisierung, Changelog des Starters,
  Copyright-Header des Open-Pioneer-Projekts in `src/`, Header-Lint-Regel).
- **Bewusst behalten:** `docs/**` (vorerst als Nachschlagewerk), `support/**`, `patches/**`, `LICENSE`, das
  Script `build-docs` (für spätere eigene Pakete).
- **Lint und Commit-Hook** korrigieren selbst, was geht, statt abzubrechen. Nur echte Fehler blockieren einen Commit.

## Eingaben

Vor dem Start beim Nutzer abfragen (Standard in Klammern):

| Eingabe        | Wofür                                                     | Standard                |
| -------------- | --------------------------------------------------------- | ----------------------- |
| Projektname    | `name` in `package.json`, Seitentitel, README-Überschrift | Name des Repo-Ordners   |
| App-Name       | Ordner `src/apps/<app-name>`, Paketname, Element-Tag      | `map-app`               |
| App-Komponente | React-Komponente und Dateiname                            | `MapApp`                |
| Startansicht   | `[Längengrad, Breitengrad]` und Zoom der Karte            | `[7.6261, 51.9607]`, 12 |
| `origin`-URL   | eigenes Git-Repository (optional, Schritt 1)              | keine (Remote entfällt) |

Der Element-Tag ist der App-Name und **muss einen Bindestrich enthalten** (Regel für Custom Elements), z. B. `map-app`.

## Voraussetzungen

- Frischer Klon von `open-pioneer/trails-starter`, sauberer Arbeitsstand.
- Node ≥ 24, pnpm ≥ 10 (Version aus `packageManager` in `package.json`).
- `pnpm install` lief einmal (installiert den Husky-Hook über `prepare`).

## Grundregeln

- **Ein Commit pro Schritt.** Der Pre-Commit-Hook (`.husky/pre-commit`) prüft das Lockfile, lässt oxfmt/oxlint auf
  die gestagten Dateien laufen, `tsc` über das ganze Projekt und die betroffenen Tests. Jeder Schritt muss für sich
  bauen, deshalb **kommt es auf die Reihenfolge an** (siehe Hinweise bei den Schritten).
- Nie nach `upstream` (den Trails-Starter) pushen. Nach `origin` nur, wenn der Nutzer es verlangt.
- Dem Nutzer nach jedem Schritt das Ergebnis zeigen (Diff-Statistik, Ausgabe der Prüfungen), bevor es weitergeht.

## Schritte

### 1. Git einrichten (optional)

**Was:** Eigenes Repository als `origin`, der Starter als `upstream` nur zum Abholen, Branches `main` und `dev`.

```bash
git remote rename origin upstream
git remote set-url --push upstream no-push      # nie versehentlich zum Starter pushen
git remote add origin <origin-url>              # nur, wenn der Nutzer eine angegeben hat
git switch -c dev
git switch -c feature/trails-to-project         # alle folgenden Schritte auf diesem Branch
```

**Arbeitsweise** (wie bei COSITE): ein Branch pro Feature von `dev`, ein Commit pro Schritt, `git merge --no-ff`
Feature → `dev` und `dev` → `main`. Hotfixes auf `main` werden in `dev` gemergt, nie rebased. Updates des Starters:
`git fetch upstream` und in einem Feature-Branch mergen.

**Warum:** Updates des Starters bleiben erreichbar, ein versehentlicher Push zum Starter ist unmöglich.

### 2. Lint, Formatierung und Commit-Hook

Kommt **vor** jeder neuen Datei, sonst schlägt die Header-Regel bei jeder neuen Datei an.

**2a. Copyright-Header in `src/` und die Header-Regel entfernen.** `src/` ist der Code des Projekts. Die zwei Zeilen

```ts
// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
```

samt der direkt folgenden Leerzeilen aus allen Dateien unter `src/` löschen, und zwar nur dort, wo die Datei wirklich
genau mit diesen zwei Zeilen beginnt:

```bash
H1='// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)'
H2='// SPDX-License-Identifier: Apache-2.0'
for f in $(git grep -l "SPDX-FileCopyrightText" -- src); do
  if [ "$(sed -n 1p "$f")" = "$H1" ] && [ "$(sed -n 2p "$f")" = "$H2" ]; then
    awk 'NR<=2{next} !started && /^[[:space:]]*$/ {next} {started=1; print}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  fi
done
```

Dateien außerhalb von `src/` (`vite.config.ts`, `oxlint.config.ts`, `support/**` …) behalten ihre Header.
Danach Regel und Plugin entfernen:

- `oxlint.config.ts`: `jsPlugins: ["@tony.ganchev/eslint-plugin-header"]` und die Regel
  `"@tony.ganchev/header/header"` samt Kommentarblock löschen.
- `package.json` (`devDependencies`) und `pnpm-workspace.yaml` (Catalog): `@tony.ganchev/eslint-plugin-header` löschen.
- `pnpm install` (aktualisiert `pnpm-lock.yaml`, sonst bricht der Hook am `--frozen-lockfile` ab).

**2b. Lint-Regeln lockern** in `oxlint.config.ts`:

| Einstellung                                                                        | Vorher  | Nachher |
| ---------------------------------------------------------------------------------- | ------- | ------- |
| `typescript/no-explicit-any`                                                       | `error` | `off`   |
| `prefer-const`, `no-var`, `no-empty`, `prefer-rest-params`, `prefer-spread`        | `error` | `warn`  |
| `import/no-duplicates`, `react/self-closing-comp`, `vitest/no-commented-out-tests` | `error` | `warn`  |
| `typescript/no-non-null-assertion`                                                 | `error` | `warn`  |
| `options.reportUnusedDisableDirectives`                                            | `error` | `warn`  |
| `no-unused-vars`                                                                   | `warn`  | `warn`  |
| `categories.correctness` (echte Fehler, z. B. `react/rules-of-hooks`)              | `error` | `error` |

Im Override für `**/*.test.*` die Zeile `"typescript/no-explicit-any": "off"` streichen (gilt jetzt global) und den
Kommentar auf `!` beschränken. Die Kommentare, die nur `no-explicit-any` abgeschaltet haben, entfernen, sie erzeugen
jetzt Warnungen:

```bash
sed -i '/^[[:space:]]*\/\/ oxlint-disable-next-line @typescript-eslint\/no-explicit-any$/d' support/create-license-report.ts
# und in src/testing/global-setup.ts die Zeile: /* oxlint-disable @typescript-eslint/no-explicit-any */
```

**2c. Hook korrigiert selbst:** in `.lintstagedrc` `oxlint --fix --no-error-on-unmatched-pattern` aufrufen
(oxfmt schreibt Dateien schon um, lint-staged staged die Änderungen neu). Typecheck und Tests bleiben im Hook.

**2d. Zeilenlänge 120:** `printWidth: 120` in `oxfmt.config.ts`, `max_line_length = 120` in `.editorconfig`.
Das Repo **noch nicht** komplett umformatieren (das ist der letzte Schritt, als eigener Commit).

**Prüfung:** `pnpm lint` ohne Fehler, `git grep -n "SPDX" -- src` leer.
**Commits:** Header + Regel (2a), Regeln + Hook (2b, 2c), Zeilenlänge (2d).

### 3. Blanko-App

Kommt **vor** dem Löschen der Samples: `src/testing/global-setup.ts` braucht `resize-observer-polyfill`, und das kommt
nur transitiv über die Kartenpakete. Gibt es zwischendurch keine Karten-App, scheitert `tsc` im Hook.

`src/apps/<app-name>/` anlegen. Die Code-Vorlagen (für `map-app` / `MapApp`) stehen identisch in
[`SKILL.md`, Schritt 3](./SKILL.md#3-blank-app):

| Datei              | Inhalt                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `package.json`     | Abhängigkeiten: Chakra, Emotion, `@open-pioneer/map`, `map-navigation`, `runtime`, `ol`, React     |
| `build.config.mjs` | `i18n: ["en"]`, Service `MainMapProvider` mit `provides: ["map.MapConfigProvider"]`                |
| `services.ts`      | `MainMapProvider`: Projektion `EPSG:3857`, Startansicht per `fromLonLat`, OSM als Basiskarte       |
| `app.ts`           | `createCustomElement` und `customElements.define("map-app", …)`                                    |
| `MapApp.tsx`       | `useMapModel` → `DefaultMapProvider` → `MapContainer`, unten rechts `InitialExtent/ZoomIn/ZoomOut` |
| `i18n/en.yaml`     | `ariaLabel.map`, `ariaLabel.mapTools`                                                              |

`src/index.html` ersetzen: Die Root-Seite zeigt nur noch `<map-app>` im Vollbild (Vorlage ebenfalls in `SKILL.md`).

Danach `pnpm install` und **mit dem Lockfile** committen.
**Prüfung:** `pnpm check-types`, `pnpm dev` zeigt die Karte.

### 4. Samples entfernen

**Was:** `src/samples/` (Map-Sample, i18n-How-to), `src/packages/sample-package/`, `src/apps/empty/` (nutzt das
Beispielpaket) und `src/sites/` löschen. In `vite.config.ts` die Konstante `sampleSites` löschen und `sites: []` setzen
(die Root-Seite bleibt über `rootSite: true`, `apps: []` ist schon leer). Danach `pnpm install` (Lockfile wird kleiner).

**Warum:** Die Samples zeigen, wie man etwas macht, sind aber kein Teil des Produkts. Dasselbe steht in `docs/`.
**Prüfung:** `pnpm check-types`, `pnpm build`, `git grep -n "samples" -- vite.config.ts` leer.

### 5. Entfernen, was zur Trails-Entwicklung gehört

- `.github/workflows/test-and-build.yml`:
    - Schritt `Build API documentation` (`pnpm build-docs`) löschen: Ohne lokale Pakete hat Typedoc nichts zu
      dokumentieren,
    - Job `deploy` löschen (deployt nach `open-pioneer/trails-demo`, läuft nur in `open-pioneer/trails-starter`),
      Workflow in `Test and build` umbenennen,
    - `pnpm vitest run --passWithNoTests`: Die Blanko-App hat keine Tests, ein einfaches `vitest run` bricht ohne
      Testdateien ab.
- `.github/workflows/audit-dependencies.yml` und `new-issue.yml` löschen: Beide rufen
  `open-pioneer/trails-repo-automation` auf (Issue-Board des Trails-Teams, gemeinsamer Audit-Workflow).
- `CHANGELOG.md`: Changelog des Starters durch ein eigenes ersetzen, mit Vermerk, auf welcher Starter-Version das
  Projekt beruht (oberster Eintrag des alten Changelogs).
- `README.md`: Projekt-README (Name, ein Satz Beschreibung, Quick start, Link auf `docs/README.md`, Lizenz).
- `package.json`: `name` = Projektname.

**Prüfung:** Lauf wie in der CI, siehe Verifikation.

### 6. Repository umformatieren

`pnpm fmt`, dann als **reine Formatierung** committen (Zeilenlänge 120 aus Schritt 2d). Eigener Commit, damit die
eigentlichen Änderungen in der Historie lesbar bleiben.

## Verifikation

```bash
pnpm install --frozen-lockfile
pnpm fmt:check
pnpm lint                              # keine Fehler, Warnungen sind in Ordnung
pnpm check-types
pnpm vitest run --passWithNoTests
pnpm build                             # dist/www
pnpm build-license-report
git grep -n "SPDX" -- src              # leer
git grep -n "samples" -- vite.config.ts  # leer
```

`pnpm dev` (oder `pnpm preview` nach dem Build) zeigt die OSM-Karte in der Startansicht mit den drei Buttons unten
rechts. Den Hook mit einer Wegwerfdatei testen (ungenutzte Variable, `any`, kaputte Formatierung): Der Commit geht
durch, die Datei wird umformatiert, höchstens eine Warnung.

## Fehlerbehebung

- **`pnpm install` bricht ab mit „Missing time for version X of <paket>“** (Trust-Policy): Die Registry hat den
  Zeitstempel, nur der lokale Metadaten-Cache nicht. `pnpm cache delete <paket>`, die Policy nicht ändern.
- **Lizenzreport scheitert nach `pnpm install`:** Ein Paket mit versionsgebundener Ausnahme in
  `support/license-config.yaml` wurde aktualisiert (COSITE: `pako` 2.1.0 → 2.2.0). Prüfen, dass die Lizenz gleich
  geblieben ist, dann die Version anpassen.
- **`tsc` im Hook scheitert an `resize-observer-polyfill`:** Kein Kartenpaket installiert, die Samples wurden gelöscht,
  bevor es die App gab (siehe Schritt 3).
- **`SectionHeading` wirft einen Fehler**, wenn die App erweitert wird: Es muss innerhalb einer `TitledSection`
  stehen (`@open-pioneer/react-utils`).

## Offene Punkte (zur Diskussion)

- **Copyright-Header vs. Apache 2.0:** Die Lizenz verlangt, bestehende Copyright-Hinweise in abgeleiteten Werken zu
  erhalten. Ist das Entfernen der Open-Pioneer-Header in `src/` in Ordnung (der App-Code dort ist neu), oder soll ein
  Hinweis bleiben, z. B. in einer `NOTICE`-Datei oder im README?
- **Eigener Header:** keiner (aktueller Stand) oder ein eigener SPDX-Header für das Projekt?
- **Dependency-Audit:** Der entfernte wöchentliche Audit kam aus der Trails-Automatisierung. Durch einen eigenen
  Workflow (`pnpm audit`) ersetzen?
- **Tests im Hook:** behalten (aktueller Stand) oder nur in der CI?
- **`docs/`:** die Starter-Doku später ausdünnen?
- **Deploy:** Ziel für das neue Projekt (GitHub Pages, eigener Server)?
- **Auslieferung:** User-Skill (`~/.claude/skills/`), Projekt-Skill (`.claude/skills/`) oder Plugin fürs Team?
