# COSITE Dashboard

Domain terms of the dashboard: measurements from SensorThings servers and map services, explored on a map and analysed
in charts. German terms are given as aliases. Framework terms (app, package, site, service) are in
[docs/Glossary.md](./docs/Glossary.md).

## Language

**Sensor** (de: Sensor):
A single measured quantity at a measuring device, e.g. soil temperature. A Datastream in the SensorThings model.
_Avoid_: Datastream (outside STA code), time series

**Station** (de: Station, Messstation):
A real measuring station that several sensors belong to; the grouping of sensors that is meaningful to people. The
dashboard forms it from the sensors itself; it is not necessarily a Thing or a Location in the SensorThings model.
_Avoid_: Location, Site (outside code), Thing

**Observed property** (de: Messgröße):
What a sensor measures, e.g. air temperature or soil moisture, with its unit. An ObservedProperty in the SensorThings
model; the dashboard's configuration takes precedence over it.
_Avoid_: Parameter, Variable
