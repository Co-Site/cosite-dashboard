import { describe, expect, it } from "vitest";
import {
    chooseFeatureInfoFormat,
    normalizeWmsEndpoint,
    parseWmsCapabilities,
    searchLayers,
    WmsCapabilitiesError,
    WmsCapabilitiesLayer
} from "./wmsCapabilities";

const CAPABILITIES = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms" xmlns:xlink="http://www.w3.org/1999/xlink">
  <Service>
    <Name>WMS</Name>
    <Title>Wetterdienst</Title>
    <ContactInformation>
      <ContactPersonPrimary><ContactPerson/><ContactOrganization>Deutscher Wetterdienst</ContactOrganization></ContactPersonPrimary>
    </ContactInformation>
    <Fees>none</Fees>
    <AccessConstraints>https://www.dwd.de/copyright</AccessConstraints>
  </Service>
  <Capability>
    <Request>
      <GetFeatureInfo>
        <Format>text/plain</Format>
        <Format>application/json</Format>
      </GetFeatureInfo>
    </Request>
    <Layer>
      <Title>Root</Title>
      <CRS>EPSG:4326</CRS>
      <CRS>EPSG:3857</CRS>
      <Layer>
        <Title>Fachlayer</Title>
        <Layer queryable="1">
          <Name>RADOLAN-RW</Name>
          <Title>Angeeichtes Radarkomposit (RW)</Title>
          <Abstract>Stündliche Radarniederschlagsdaten</Abstract>
          <Attribution><Title>© DWD</Title></Attribution>
          <Style>
            <Name>default</Name>
            <Title>Default</Title>
            <LegendURL width="94" height="321">
              <Format>image/png</Format>
              <OnlineResource xlink:type="simple" xlink:href="https://example.org/legend.png"/>
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="0">
          <Name>Topo</Name>
          <Title>Topographie</Title>
          <CRS>EPSG:25832</CRS>
        </Layer>
      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`;

describe("parseWmsCapabilities", () => {
    const capabilities = parseWmsCapabilities(CAPABILITIES);

    it("reads service information", () => {
        expect(capabilities).toMatchObject({
            serviceTitle: "Wetterdienst",
            contactOrganization: "Deutscher Wetterdienst",
            fees: undefined,
            accessConstraints: "https://www.dwd.de/copyright",
            featureInfoFormats: ["text/plain", "application/json"]
        });
    });

    it("lists named layers with their parents' titles", () => {
        expect(capabilities.layers).toEqual([
            {
                name: "RADOLAN-RW",
                title: "Angeeichtes Radarkomposit (RW)",
                abstract: "Stündliche Radarniederschlagsdaten",
                queryable: true,
                attribution: "© DWD",
                legendUrl: "https://example.org/legend.png",
                supportsMapProjection: true,
                path: ["Root", "Fachlayer"]
            },
            {
                name: "Topo",
                title: "Topographie",
                abstract: undefined,
                queryable: false,
                attribution: undefined,
                legendUrl: undefined,
                // CRS are inherited from the parent layers.
                supportsMapProjection: true,
                path: ["Root", "Fachlayer"]
            }
        ]);
    });

    it("rejects exception reports and other documents", () => {
        const exception = `<?xml version="1.0"?>
            <ServiceExceptionReport version="1.3.0"><ServiceException>Unknown language</ServiceException></ServiceExceptionReport>`;
        expect(() => parseWmsCapabilities(exception)).toThrow(WmsCapabilitiesError);
        expect(() => parseWmsCapabilities(exception)).toThrow(/Unknown language/);
        expect(() => parseWmsCapabilities("<html><body>Not found</body></html>")).toThrow(WmsCapabilitiesError);
    });
});

describe("normalizeWmsEndpoint", () => {
    it("removes the parameters of a pasted GetCapabilities URL and keeps others", () => {
        expect(
            normalizeWmsEndpoint(" https://example.org/wms?service=WMS&REQUEST=GetCapabilities&Version=1.3.0 ")
        ).toBe("https://example.org/wms");
        expect(normalizeWmsEndpoint("https://example.org/cgi?map=/maps/x.map&SERVICE=WMS")).toBe(
            "https://example.org/cgi?map=%2Fmaps%2Fx.map"
        );
    });

    it("rejects other protocols and invalid URLs", () => {
        expect(() => normalizeWmsEndpoint("javascript:alert(1)")).toThrow(/protocol/);
        expect(() => normalizeWmsEndpoint("maps.dwd.de")).toThrow(/Invalid URL/);
    });
});

describe("chooseFeatureInfoFormat", () => {
    it("prefers JSON, then GeoJSON", () => {
        expect(chooseFeatureInfoFormat(["text/html", "application/geo+json", "application/json"])).toBe(
            "application/json"
        );
        expect(chooseFeatureInfoFormat(["text/html", "application/geo+json"])).toBe("application/geo+json");
    });

    it("returns nothing for formats the dashboard cannot read", () => {
        expect(chooseFeatureInfoFormat(["text/html", "application/vnd.ogc.gml"])).toBeUndefined();
    });
});

describe("searchLayers", () => {
    const layer = (name: string, title: string) => ({ name, title }) as WmsCapabilitiesLayer;
    const layers = [
        layer("RADOLAN-RX", "Radarreflektivität (RX)"),
        layer("radar_mask", "Maske"),
        layer("RADOLAN-RW", "Angeeichtes Radarkomposit (RW)"),
        layer("T2M", "Temperatur")
    ];
    const names = (query: string, limit?: number) => searchLayers(layers, query, limit).results.map((l) => l.name);

    it("ranks an exact name first, then title matches, then name matches", () => {
        expect(names("radar")).toEqual(["RADOLAN-RX", "RADOLAN-RW", "radar_mask"]);
        expect(names("radolan-rw")).toEqual(["RADOLAN-RW"]);
        expect(names("t2m")).toEqual(["T2M"]);
    });

    it("limits the results and reports the total", () => {
        expect(searchLayers(layers, "radar", 1)).toEqual({ results: [layers[0]], total: 3 });
    });

    it("finds nothing without a query", () => {
        expect(searchLayers(layers, "  ")).toEqual({ results: [], total: 0 });
    });
});
