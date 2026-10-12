# COSITE Dashboard

A web dashboard for the COSITE project. It brings weather data from the German Weather Service (DWD) and
observations from in-situ sensors (OGC SensorThings API) together on one map and lets you analyse them.

## Features

- **Map layers:** DWD web map services, e.g. the ICON 2 m air temperature forecast and the hourly radar
  precipitation (RADOLAN RW), each with its own transparency slider in the table of contents.
- **Sensors:** datastreams of the COSITE SensorThings API (currently soil temperature and soil moisture in
  Cologne-Kalk). Clicking a sensor point lists all sensors at that location.
- **Analysis panel:** observations of a single sensor or two sensors side by side, as line chart, bar chart
  (mean per hour, day or week), box plot or wind rose (basic version). Time range: last 24 hours, 7 or 30 days,
  the entire period, or a custom range.
- **Feature info:** clicking the map shows the values of the visible WMS layers, including their legends.
- **Configurable data:** all layers and sensors are defined in `src/public/config/dataLayers.json`, which is loaded
  at runtime, so sources can be added or changed without rebuilding.
- **English and German** user interface, switchable at runtime.

Built on the [Open Pioneer Trails starter](https://github.com/open-pioneer/trails-starter) (React, Chakra UI,
OpenLayers, Chart.js). The app lives in `src/apps/dashboard`.

## Quick start

Ensure that you have [Node](https://nodejs.org/en/) (Version 24 or later) and [pnpm](https://pnpm.io/) (Version 10 or later) installed.

Then execute the following commands to get started:

```bash
$ pnpm install                                                 # Install dependencies
$ pnpm run dev                                                 # Launch development server
```

Vite will print the project's local address (usually <http://localhost:5173/>).
Point your browser at it and start programming!

Run the tests with `pnpm test`. `pnpm build` creates a production build in `dist/www`.

## Documentation

- [docs/DashboardWiring.md](./docs/DashboardWiring.md): how the app is structured and how data layers are configured
  (in German).
- [docs/DashboardDecisions.md](./docs/DashboardDecisions.md): why the dashboard is built the way it is, including the
  branch workflow (in German).
- [docs/README.md](./docs/README.md): general documentation of the Trails starter.

## See also

- [Core packages](https://github.com/open-pioneer/trails-core-packages): Contains the runtime package and other central packages.
- [OpenLayers base packages](https://github.com/open-pioneer/trails-openlayers-base-packages): Contains packages using OpenLayers to render a map.
- [Build tools](https://github.com/open-pioneer/trails-build-tools): Contains our build tooling such as the Vite plugin.

## License

Apache-2.0 (see `LICENSE` file)
