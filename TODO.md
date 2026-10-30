# TODO

What has to be done next. Each entry describes **what** was decided, not how to build it. The pool of ideas and the
reasoning behind decisions are in [docs/DashboardDecisions.md](./docs/DashboardDecisions.md) (section 15). Terms are
defined in [GLOSSARY.md](./GLOSSARY.md).

## Observed properties in the configuration

- `dataLayers.json` gets a central list of observed properties: key, name (de/en) and unit,
  e.g. `air_temperature`, "Lufttemperatur" / "Air temperature", `°C`.
- Every sensor references its observed property by key.
- Configuration over STA: where a sensor has an observed property, its name and unit are used everywhere (single
  sensor, sensor comparison, tiles) instead of the STA ObservedProperty and unitOfMeasurement.
- No unit conversion. Whoever assigns a sensor to an observed property makes sure the unit fits.

## Observed property comparison

- A third tab in the analysis panel, next to single sensor and sensor comparison.
- Choose an observed property. Next to the chart, all sensors with this observed property are listed with a checkbox
  each, all checked initially. Every checked sensor is one series in **one** chart.
- All chart types should be selectable.
- Sensors without a configured observed property do not appear.
- The time filter works as in the other tabs.
- Depends on: [Observed properties in the configuration](#observed-properties-in-the-configuration).
- Prerequisite for testing: a second real station. Datastreams 1–12 on the STA server are dummies.
- Open: label of a series (layer name or station name).
