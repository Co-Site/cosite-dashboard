# TODO

What has to be done next. Each entry describes **what** was decided, not how to build it. The pool of ideas and the
reasoning behind decisions are in [docs/DashboardDecisions.md](./docs/DashboardDecisions.md) (section 15). Terms are
defined in [GLOSSARY.md](./GLOSSARY.md).

## Manual review of `dev` (for me, not for Claude)

- Next time, before anything else: review the `dev` branch by hand. `feature/observed_properties` was merged on
  2026-11-13 (observed property and unit per sensor, observed property comparison tab, station colours, refactoring
  and simplification) without a manual review.

## Observed property comparison: more chart types

The tab exists with a line chart (see `docs/DashboardDecisions.md`, section 20). Still to do:

- Bar chart for several sensors: grouped bars per section of time (mean per sensor).
- Box plot for several sensors: one box per sensor, side by side.
- No wind rose in the comparison.
- Open: label of a series. For now the layer name; the station name is the alternative.
- For testing: datastream 14 and 16 both measure soil temperature. Datastreams 1–12 on the STA server are dummies.
