import { afterEach, describe, expect, it, vi } from "vitest";
import { CapabilitiesError } from "./owsService";
import { chooseFeatureInfoFormat, parseWmsCapabilities, probeWmsLayer } from "./wmsCapabilities";

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
                path: ["Root", "Fachlayer"],
                isGroup: false
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
                path: ["Root", "Fachlayer"],
                isGroup: false
            }
        ]);
    });

    it("rejects exception reports and other documents", () => {
        const exception = `<?xml version="1.0"?>
            <ServiceExceptionReport version="1.3.0"><ServiceException>Unknown language</ServiceException></ServiceExceptionReport>`;
        expect(() => parseWmsCapabilities(exception)).toThrow(CapabilitiesError);
        expect(() => parseWmsCapabilities(exception)).toThrow(/Unknown language/);
        expect(() => parseWmsCapabilities("<html><body>Not found</body></html>")).toThrow(CapabilitiesError);
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

describe("probeWmsLayer", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const respond = (body: string, contentType: string, status = 200) =>
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } }))
        );

    it("accepts an image", async () => {
        respond("png", "image/png");
        await expect(probeWmsLayer("https://example.org/wms", "a", [0, 0])).resolves.toBeUndefined();
        const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as URL);
        expect(url.searchParams.get("REQUEST")).toBe("GetMap");
        expect(url.searchParams.get("LAYERS")).toBe("a");
        expect(url.searchParams.get("WIDTH")).toBe("1");
    });

    it("reports a service exception (sent with HTTP 200)", async () => {
        respond(
            `<ServiceExceptionReport><ServiceException code="LayerNotDefined" locator="layers">
                Could not find layer Wetter</ServiceException></ServiceExceptionReport>`,
            "text/xml"
        );
        await expect(probeWmsLayer("https://example.org/wms", "Wetter", [0, 0])).resolves.toBe(
            "Could not find layer Wetter"
        );
    });

    it("reports HTTP and network errors", async () => {
        respond("<html>Internal Server Error</html>", "text/html", 500);
        await expect(probeWmsLayer("https://example.org/wms", "a", [0, 0])).resolves.toBe("HTTP 500");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new TypeError("Failed to fetch");
            })
        );
        await expect(probeWmsLayer("https://example.org/wms", "a", [0, 0])).resolves.toBe("Failed to fetch");
    });
});
