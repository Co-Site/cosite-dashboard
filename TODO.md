# TODO

What has to be done next. Each entry describes **what** was decided, not how to build it. The pool of ideas and the
reasoning behind decisions are in [docs/DashboardDecisions.md](./docs/DashboardDecisions.md) (section 15). Terms are
defined in [GLOSSARY.md](./GLOSSARY.md).

## Observed property comparison

- A third tab in the analysis panel, next to single sensor and sensor comparison.
- Choose an observed property. Next to the chart, all sensors with this observed property are listed with a checkbox
  each, all checked initially. Every checked sensor is one series in **one** chart.
- All chart types should be selectable.
- Sensors without a configured observed property do not appear.
- The time filter works as in the other tabs.
- Sensors name their observed property by key (`observedProperty` in `dataLayers.json`); sensors with the same key
  belong together.
- For testing: datastream 16 (demo node) is the second station with soil temperature, next to datastream 14.
  Datastreams 1–12 on the STA server are dummies.
- Open: label of a series (layer name or station name).
- Open: name of an observed property in the selection. The configuration only has the key, no translated name.
