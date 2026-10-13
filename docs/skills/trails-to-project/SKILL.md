---
name: trails-to-project
description: Turn a fresh clone of the Open Pioneer Trails starter (open-pioneer/trails-starter) into a blank project of its own - remove samples and everything specific to Trails development, relax lint and commit hook, and add a single app with a map service, an OSM base map and zoom buttons. Use when starting a new project from the Trails starter.
---

# Trails starter → project

> **Status: draft for discussion.** German version: `SKILL.de.md`.
> Keep both files in sync.

## Goal

The [Trails starter](https://github.com/open-pioneer/trails-starter) is a mix of how-to and demonstrator: sample apps,
a sample package, an empty app, demo sites, CI that deploys the Trails demo and calls the Trails team's automation.
This skill turns a fresh clone into a **blank project**:

- **One app** `src/apps/<app-name>` with a map service (`map.MapConfigProvider`), an OpenStreetMap base map and the
  buttons _initial extent_, _zoom in_, _zoom out_. Nothing else.
- The root page `src/index.html` hosts the app full screen, so `pnpm dev` opens it directly.
- **Removed:** samples, sample package, empty app, sites, everything only needed for developing Trails itself
  (API docs step and Trails demo deploy in CI, Trails repo automation, starter changelog, copyright headers of the
  Open Pioneer project in `src/`, header lint rule).
- **Kept on purpose:** `docs/**` (reference for now), `support/**`, `patches/**`, `LICENSE`, the `build-docs`
  script (for own packages later).
- **Lint and commit hook** fix what they can instead of failing; only real bugs block a commit (default –
  every lint, format and hook setting is asked, see step 2).

## Inputs

Ask the user for these before starting (defaults in brackets):

| Input         | Used for                                                   | Default                 |
| ------------- | ---------------------------------------------------------- | ----------------------- |
| Project name  | `package.json` `name`, page title, README heading          | name of the repo dir    |
| App name      | directory `src/apps/<app-name>`, package name, element tag | `map-app`               |
| App component | React component and file name                              | `MapApp`                |
| Initial view  | `[longitude, latitude]` and zoom of the map                | `[7.6261, 51.9607]`, 12 |
| `origin` URL  | own Git repository (optional, step 1)                      | none (skip remote)      |

The element tag is the app name and **must contain a hyphen** (custom element rule), e.g. `map-app`.

The lint, format and hook settings are asked separately at the start of step 2 – **all** of them, see there.

## Prerequisites

- Fresh clone of `open-pioneer/trails-starter`, clean working tree.
- Node ≥ 24, pnpm ≥ 10 (version from `packageManager` in `package.json`).
- `pnpm install` has run once (installs the Husky hook via `prepare`).

## Ground rules

- **One commit per step.** The pre-commit hook (`.husky/pre-commit`) checks the lockfile, runs oxfmt/oxlint on
  staged files, `tsc` on the whole project and the affected tests. Every step must build on its own, so the
  **order of the steps matters** (see the notes on each step).
- Never push to `upstream` (the Trails starter). Push to `origin` only when the user asks.
- Show the user the result of each step (diff stat, check output) before going on.

## Steps

### 1. Git setup (optional)

**What:** Own repository as `origin`, the starter as read-only `upstream`, branches `main` and `dev`.

```bash
git remote rename origin upstream
git remote set-url --push upstream no-push      # never push to the starter by accident
git remote add origin <origin-url>              # only if the user gave one
git switch -c dev
git switch -c feature/trails-to-project         # all following steps on this branch
```

**Workflow:** one branch per feature from `dev`, one commit per step, `git merge --no-ff` feature → `dev`
and `dev` → `main`. Hotfixes on `main` are merged into `dev`, never rebased. Updates of the starter: `git fetch upstream`
and merge them in a feature branch.

**Why:** Starter updates stay available, an accidental push to the starter is impossible.

### 2. Lint, format and commit hook

Comes **before** any new file, otherwise the header rule fails on every new file.

> **Ask the user about every setting in this step.** All values below (headers, rule levels, hook behaviour,
> line length) are **defaults** – a proposal – not a fixed recipe. Preferences differ a lot
> between teams and people. Before changing anything:
>
> - Go through **all** settings of 2a–2d with the user and show for each one the starter's value and the default
>   proposed here. Also offer the rules of `oxlint.config.ts` that are not in the table (current level from the file).
> - Ask about the formatter options too (`oxfmt.config.ts`: `printWidth`, `tabWidth`, `semi`, `singleQuote`,
>   `trailingComma`) and about which checks the hook runs (lockfile, format, lint, `tsc`, tests) and whether lint
>   fixes or fails.
> - Ask in small groups (e.g. headers · rule levels · hook · formatting), not one setting after the other.
>   "Take the defaults" is a valid answer for a group.
> - Never apply a default silently. Note the chosen values in the commit message.

**2a. Remove the copyright headers in `src/` and the header rule.** `src/` is the project's code. Remove the two lines

```ts
// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
```

plus the blank lines right after them from every file under `src/` – only where the file really starts with exactly
these two lines:

```bash
H1='// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)'
H2='// SPDX-License-Identifier: Apache-2.0'
for f in $(git grep -l "SPDX-FileCopyrightText" -- src); do
  if [ "$(sed -n 1p "$f")" = "$H1" ] && [ "$(sed -n 2p "$f")" = "$H2" ]; then
    awk 'NR<=2{next} !started && /^[[:space:]]*$/ {next} {started=1; print}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  fi
done
```

Files outside `src/` (`vite.config.ts`, `oxlint.config.ts`, `support/**` …) keep their headers.
Then remove the rule and the plugin:

- `oxlint.config.ts`: delete `jsPlugins: ["@tony.ganchev/eslint-plugin-header"]` and the rule
  `"@tony.ganchev/header/header"` including its comment block.
- `package.json` (`devDependencies`) and `pnpm-workspace.yaml` (catalog): delete `@tony.ganchev/eslint-plugin-header`.
- `pnpm install` (updates `pnpm-lock.yaml`, otherwise the hook fails at `--frozen-lockfile`).

**2b. Relax the lint rules** in `oxlint.config.ts`:

| Setting                                                                            | Starter | Default |
| ---------------------------------------------------------------------------------- | ------- | ------- |
| `typescript/no-explicit-any`                                                       | `error` | `off`   |
| `prefer-const`, `no-var`, `no-empty`, `prefer-rest-params`, `prefer-spread`        | `error` | `warn`  |
| `import/no-duplicates`, `react/self-closing-comp`, `vitest/no-commented-out-tests` | `error` | `warn`  |
| `typescript/no-non-null-assertion`                                                 | `error` | `warn`  |
| `options.reportUnusedDisableDirectives`                                            | `error` | `warn`  |
| `no-unused-vars`                                                                   | `warn`  | `warn`  |
| `categories.correctness` (real bugs, e.g. `react/rules-of-hooks`)                  | `error` | `error` |

In the override for `**/*.test.*`, drop `"typescript/no-explicit-any": "off"` (now global) and change the comment
to only mention `!`. Remove the comments that only disabled `no-explicit-any` – they now cause warnings:

```bash
sed -i '/^[[:space:]]*\/\/ oxlint-disable-next-line @typescript-eslint\/no-explicit-any$/d' support/create-license-report.ts
# and in src/testing/global-setup.ts the line: /* oxlint-disable @typescript-eslint/no-explicit-any */
```

**2c. Let the hook fix things:** in `.lintstagedrc` call `oxlint --fix --no-error-on-unmatched-pattern`
(oxfmt already rewrites files; lint-staged re-stages the changes). Typecheck and tests stay in the hook.

**2d. Line length 120:** `printWidth: 120` in `oxfmt.config.ts`, `max_line_length = 120` in `.editorconfig`.
Do **not** reformat the whole repo yet (that is the last step, as a commit of its own).

**Check:** `pnpm lint` without errors, `git grep -n "SPDX" -- src` empty.
**Commits:** headers + rule (2a), rules + hook (2b, 2c), line length (2d).

### 3. Blank app

Comes **before** removing the samples: `src/testing/global-setup.ts` needs `resize-observer-polyfill`, which only
arrives transitively through the map packages. Without any map app in between, `tsc` in the hook fails.

Create `src/apps/<app-name>/` (shown for `map-app` / `MapApp`):

`package.json`

```json
{
    "name": "map-app",
    "private": true,
    "dependencies": {
        "@chakra-ui/react": "catalog:",
        "@emotion/react": "catalog:",
        "@emotion/styled": "catalog:",
        "@open-pioneer/map": "catalog:",
        "@open-pioneer/map-navigation": "catalog:",
        "@open-pioneer/runtime": "catalog:",
        "ol": "catalog:",
        "react": "catalog:",
        "react-dom": "catalog:"
    }
}
```

`build.config.mjs` – registers the map service:

```js
import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    i18n: ["en"],
    services: {
        MainMapProvider: {
            provides: ["map.MapConfigProvider"]
        }
    }
});
```

`services.ts` – the map service with the base map:

```ts
import { MapConfig, MapConfigProvider, MapConfigProviderOptions, SimpleLayer } from "@open-pioneer/map";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";

export const MAP_ID = "main";

const PROJECTION = "EPSG:3857";

// Initial map center (longitude, latitude).
const [INITIAL_X = 0, INITIAL_Y = 0] = fromLonLat([7.6261, 51.9607], PROJECTION);

/** Provides the configuration of the main map: projection, initial view and base layers. */
export class MainMapProvider implements MapConfigProvider {
    mapId = MAP_ID;

    async getMapConfig({ layerFactory }: MapConfigProviderOptions): Promise<MapConfig> {
        return {
            initialView: {
                kind: "position",
                center: { x: INITIAL_X, y: INITIAL_Y },
                zoom: 12
            },
            projection: PROJECTION,
            baseLayers: [
                layerFactory.create({
                    type: SimpleLayer,
                    title: "OpenStreetMap",
                    olLayer: new TileLayer({
                        source: new OSM(),
                        properties: { title: "OSM" }
                    })
                })
            ]
        };
    }
}
```

`app.ts` – the custom element:

```ts
import { createCustomElement } from "@open-pioneer/runtime";
import * as appMetadata from "open-pioneer:app";
import { MapApp } from "./MapApp";

const element = createCustomElement({
    component: MapApp,
    appMetadata
});

customElements.define("map-app", element);
```

`MapApp.tsx` – map with the navigation buttons:

```tsx
import { Flex } from "@chakra-ui/react";
import { DefaultMapProvider, MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { useIntl } from "open-pioneer:react-hooks";
import { MAP_ID } from "./services";

export function MapApp() {
    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);

    return (
        <Flex height="100%" direction="column" overflow="hidden">
            {map && (
                <DefaultMapProvider map={map}>
                    <MapContainer aria-label={intl.formatMessage({ id: "ariaLabel.map" })}>
                        <MapAnchor position="bottom-right" horizontalGap={10} verticalGap={30}>
                            <Flex
                                role="toolbar"
                                aria-label={intl.formatMessage({ id: "ariaLabel.mapTools" })}
                                direction="column"
                                gap={1}
                                padding={1}
                            >
                                <InitialExtent />
                                <ZoomIn />
                                <ZoomOut />
                            </Flex>
                        </MapAnchor>
                    </MapContainer>
                </DefaultMapProvider>
            )}
        </Flex>
    );
}
```

`i18n/en.yaml`

```yaml
messages:
    ariaLabel:
        map: "Map. Use the arrow keys to move the map. Zoom in with the plus button and zoom out with the minus button."
        mapTools: "Map tools"
```

Replace `src/index.html` – the root page hosts the app full screen:

```html
<!doctype html>
<html lang="en" style="height: 100%">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Project</title>
        <style>
            html,
            body {
                margin: 0px;
            }

            .full-height {
                height: 100%;
                max-height: 100%;
            }
        </style>
    </head>

    <body class="full-height">
        <map-app class="full-height"></map-app>
        <script type="module" src="./apps/map-app/app.ts"></script>
    </body>
</html>
```

Then `pnpm install` and commit **with the lockfile**.
**Check:** `pnpm check-types`, `pnpm dev` shows the map.

### 4. Remove the samples

**What:** Delete `src/samples/` (map sample, i18n how-to), `src/packages/sample-package/`, `src/apps/empty/` (uses the
sample package) and `src/sites/`. In `vite.config.ts` delete the constant `sampleSites` and set `sites: []`
(the root site stays via `rootSite: true`, `apps: []` is already empty). Then `pnpm install` (lockfile shrinks).

**Why:** The samples show how to do things, but are not part of the product. The same content is in `docs/`.
**Check:** `pnpm check-types`, `pnpm build`, `git grep -n "samples" -- vite.config.ts` empty.

### 5. Remove what belongs to the Trails development

- `.github/workflows/test-and-build.yml`:
    - delete the step `Build API documentation` (`pnpm build-docs`): without local packages Typedoc has nothing to
      document,
    - delete the job `deploy` (deploys to `open-pioneer/trails-demo`, only runs in `open-pioneer/trails-starter`),
      rename the workflow to `Test and build`,
    - `pnpm vitest run --passWithNoTests`: the blank app has no tests, plain `vitest run` fails without test files.
- Delete `.github/workflows/audit-dependencies.yml` and `new-issue.yml`: both call
  `open-pioneer/trails-repo-automation` (issue board of the Trails team, shared audit workflow).
- `CHANGELOG.md`: replace the starter's changelog with an own one, noting the starter version the project is based on
  (top entry of the old changelog).
- `README.md`: project README (name, one-line description, quick start, link to `docs/README.md`, license).
- `package.json`: `name` = project name.

**Check:** CI-like run, see Verification.

### 6. Reformat the repository

`pnpm fmt`, then commit as **formatting only** (line length 120 from step 2d). Separate commit, so the real changes stay
readable in the history.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm fmt:check
pnpm lint                              # no errors, warnings are fine
pnpm check-types
pnpm vitest run --passWithNoTests
pnpm build                             # dist/www
pnpm build-license-report
git grep -n "SPDX" -- src              # empty
git grep -n "samples" -- vite.config.ts  # empty
```

`pnpm dev` (or `pnpm preview` after the build) shows the OSM map at the initial view with the three buttons bottom
right. Test the hook with a throwaway file (unused variable, `any`, bad formatting): the commit goes through, the file
is reformatted, at most a warning.

## Troubleshooting

- **`pnpm install` fails with "Missing time for version X of <package>"** (trust policy): the registry has the
  timestamp, only the local metadata cache does not. `pnpm cache delete <package>`, do not change the policy.
- **License report fails after `pnpm install`:** a package with a version-specific exception in
  `support/license-config.yaml` was updated (e.g. `pako` 2.1.0 → 2.2.0). Check that the license is unchanged, then
  adjust the version.
- **`tsc` in the hook fails on `resize-observer-polyfill`:** no map package installed – the samples were removed
  before the app existed (see step 3).
- **`SectionHeading` throws** when the app is extended: it must be inside a `TitledSection`
  (`@open-pioneer/react-utils`).

## Open points (for discussion)

- **Copyright headers vs. Apache 2.0:** The license asks to keep existing copyright notices in derived work. Is
  removing the Open Pioneer headers in `src/` fine (the app code there is new), or should a notice stay, e.g. in
  `NOTICE` or the README?
- **Own header:** none (default) or an own SPDX header for the project?
- **Dependency audit:** the removed weekly audit came from the Trails automation. Replace it with an own workflow
  (`pnpm audit`)?
- **Tests in the hook:** keep (default) or only in CI?
- **`docs/`:** thin out the starter docs later?
- **Deploy:** target for the new project (GitHub Pages, own server)?
- **Delivery:** user skill (`~/.claude/skills/`), project skill (`.claude/skills/`) or a plugin for the team?
