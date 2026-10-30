import { afterEach, describe, expect, it, vi } from "vitest";
import { CapabilitiesError } from "./owsService";
import {
    chooseCrs,
    chooseOutputFormat,
    epsgCode,
    fetchWfsCapabilities,
    getFeatureUrl,
    outputFormatEncoding,
    parseWfsCapabilities,
    probeWfsFeatureType
} from "./wfsCapabilities";

/** Shortened from the WFS of Hamburg (deegree): output formats per feature type. */
const HAMBURG_2_0 = `<?xml version="1.0" encoding="UTF-8"?>
<WFS_Capabilities version="2.0.0" xmlns="http://www.opengis.net/wfs/2.0" xmlns:ows="http://www.opengis.net/ows/1.1">
  <ows:ServiceIdentification>
    <ows:Title>WFS ALKIS Verwaltungsgrenzen Hamburg</ows:Title>
    <ows:Fees>Datenlizenz Deutschland Namensnennung 2.0</ows:Fees>
    <ows:AccessConstraints>Es gelten keine Zugriffsbeschränkungen</ows:AccessConstraints>
  </ows:ServiceIdentification>
  <ows:ServiceProvider><ows:ProviderName>LGV Hamburg</ows:ProviderName></ows:ServiceProvider>
  <ows:OperationsMetadata>
    <ows:Operation name="GetFeature"/>
    <ows:Parameter name="outputFormat">
      <ows:AllowedValues><ows:Value>application/gml+xml; version=3.2</ows:Value></ows:AllowedValues>
    </ows:Parameter>
  </ows:OperationsMetadata>
  <FeatureTypeList>
    <FeatureType>
      <Name xmlns:app="http://www.deegree.org/app">app:landesgrenze</Name>
      <Title>landesgrenze</Title>
      <DefaultCRS>EPSG:25832</DefaultCRS>
      <OtherCRS>EPSG:4326</OtherCRS>
      <OtherCRS>EPSG:3857</OtherCRS>
      <OutputFormats>
        <Format>application/gml+xml; version=3.1</Format>
        <Format>text/csv</Format>
        <Format>application/geo+json</Format>
      </OutputFormats>
    </FeatureType>
    <FeatureType>
      <Name xmlns:app="http://www.deegree.org/app">app:bezirke</Name>
      <DefaultCRS>EPSG:25832</DefaultCRS>
    </FeatureType>
    <FeatureType><Title>Without name</Title></FeatureType>
  </FeatureTypeList>
</WFS_Capabilities>`;

/** Shortened from the WFS of DWD (GeoServer): prefixed elements, output formats only for the operation. */
const DWD_1_1 = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:WFS_Capabilities version="1.1.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ows="http://www.opengis.net/ows"
    xmlns:dwd="https://www.dwd.de">
  <ows:ServiceIdentification><ows:Title>DWD GeoServer WFS</ows:Title><ows:Fees>none</ows:Fees></ows:ServiceIdentification>
  <ows:OperationsMetadata>
    <ows:Operation name="GetFeature">
      <ows:Parameter name="outputFormat"><ows:Value>GML2</ows:Value><ows:Value>application/json</ows:Value></ows:Parameter>
    </ows:Operation>
  </ows:OperationsMetadata>
  <wfs:FeatureTypeList>
    <wfs:FeatureType>
      <wfs:Name>dwd:RBSN_T2m</wfs:Name>
      <wfs:Title>2m Temperatur an RBSN Stationen</wfs:Title>
      <wfs:Abstract>Messwerte der 2m Temperatur</wfs:Abstract>
      <wfs:DefaultSRS>urn:ogc:def:crs:EPSG::4258</wfs:DefaultSRS>
    </wfs:FeatureType>
  </wfs:FeatureTypeList>
</wfs:WFS_Capabilities>`;

describe("parseWfsCapabilities", () => {
    it("reads service information and feature types of WFS 2.0", () => {
        const capabilities = parseWfsCapabilities(HAMBURG_2_0);
        expect(capabilities).toMatchObject({
            version: "2.0.0",
            serviceTitle: "WFS ALKIS Verwaltungsgrenzen Hamburg",
            contactOrganization: "LGV Hamburg",
            fees: "Datenlizenz Deutschland Namensnennung 2.0",
            accessConstraints: "Es gelten keine Zugriffsbeschränkungen"
        });
        expect(capabilities.featureTypes).toEqual([
            {
                name: "app:landesgrenze",
                title: "landesgrenze",
                abstract: undefined,
                namespace: "http://www.deegree.org/app",
                crs: ["EPSG:25832", "EPSG:4326", "EPSG:3857"],
                outputFormats: ["application/gml+xml; version=3.1", "text/csv", "application/geo+json"]
            },
            {
                name: "app:bezirke",
                title: "app:bezirke",
                abstract: undefined,
                namespace: "http://www.deegree.org/app",
                crs: ["EPSG:25832"],
                // No formats of its own: the service-wide list.
                outputFormats: ["application/gml+xml; version=3.2"]
            }
        ]);
    });

    it("reads prefixed WFS 1.1 documents with formats of the GetFeature operation", () => {
        const capabilities = parseWfsCapabilities(DWD_1_1);
        expect(capabilities.version).toBe("1.1.0");
        expect(capabilities.fees).toBeUndefined();
        expect(capabilities.featureTypes).toEqual([
            {
                name: "dwd:RBSN_T2m",
                title: "2m Temperatur an RBSN Stationen",
                abstract: "Messwerte der 2m Temperatur",
                namespace: "https://www.dwd.de",
                crs: ["urn:ogc:def:crs:EPSG::4258"],
                outputFormats: ["GML2", "application/json"]
            }
        ]);
    });

    it("rejects exception reports, other documents and other versions", () => {
        const exception = `<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1">
            <ows:Exception><ows:ExceptionText>Unknown service</ows:ExceptionText></ows:Exception></ows:ExceptionReport>`;
        expect(() => parseWfsCapabilities(exception)).toThrow(CapabilitiesError);
        expect(() => parseWfsCapabilities(exception)).toThrow(/Unknown service/);
        expect(() => parseWfsCapabilities(`<WMS_Capabilities version="1.3.0"/>`)).toThrow(CapabilitiesError);
        expect(() => parseWfsCapabilities(`<WFS_Capabilities version="1.0.0"/>`)).toThrow(/version '1.0.0'/);
    });
});

describe("fetchWfsCapabilities", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("asks for the next version if the service cannot answer the newest one", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (url: URL) =>
                url.searchParams.get("VERSION") === "2.0.0"
                    ? new Response(`<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows"/>`)
                    : new Response(DWD_1_1)
            )
        );
        const capabilities = await fetchWfsCapabilities("https://example.org/old-wfs");
        expect(capabilities.version).toBe("1.1.0");
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it("does not retry network errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new TypeError("Failed to fetch");
            })
        );
        await expect(fetchWfsCapabilities("https://example.org/unreachable")).rejects.toMatchObject({
            kind: "unreachable"
        });
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
});

describe("output formats", () => {
    it("recognizes GeoJSON and GML variants", () => {
        expect(outputFormatEncoding("application/json; subtype=geojson")).toBe("geojson");
        expect(outputFormatEncoding("application/geo+json")).toBe("geojson");
        expect(outputFormatEncoding("json")).toBe("geojson");
        expect(outputFormatEncoding("application/vnd.ogc.fg+json")).toBeUndefined();
        expect(outputFormatEncoding("application/gml+xml; version=3.2")).toBe("gml32");
        expect(outputFormatEncoding("text/xml; subtype=gml/3.2.1")).toBe("gml32");
        expect(outputFormatEncoding("gml32")).toBe("gml32");
        expect(outputFormatEncoding("text/xml; subtype=gml/3.1.1")).toBe("gml3");
        expect(outputFormatEncoding("gml3")).toBe("gml3");
        expect(outputFormatEncoding("GML2")).toBe("gml2");
        expect(outputFormatEncoding("text/xml; subtype=gml/2.1.2")).toBe("gml2");
        expect(outputFormatEncoding("SHAPE-ZIP")).toBeUndefined();
    });

    it("prefers GeoJSON, then the newest GML", () => {
        expect(chooseOutputFormat(["GML2", "application/gml+xml; version=3.2", "application/json"])).toBe(
            "application/json"
        );
        expect(chooseOutputFormat(["GML2", "text/xml; subtype=gml/3.1.1", "application/gml+xml; version=3.2"])).toBe(
            "application/gml+xml; version=3.2"
        );
        expect(chooseOutputFormat(["text/csv", "SHAPE-ZIP"])).toBeUndefined();
    });
});

describe("coordinate reference systems", () => {
    it("reads EPSG codes of the usual notations", () => {
        expect(epsgCode("EPSG:3857")).toBe(3857);
        expect(epsgCode("urn:ogc:def:crs:EPSG::25832")).toBe(25832);
        expect(epsgCode("urn:x-ogc:def:crs:EPSG:6.18:3857")).toBe(3857);
        expect(epsgCode("http://www.opengis.net/def/crs/EPSG/0/4326")).toBe(4326);
        expect(epsgCode("http://www.opengis.net/gml/srs/epsg.xml#25833")).toBe(25833);
        expect(epsgCode("CRS:84")).toBeUndefined();
    });

    it("prefers projected systems of the map, written as the service lists them", () => {
        expect(chooseCrs(["EPSG:25832", "EPSG:4326", "EPSG:3857"])).toBe("EPSG:3857");
        expect(chooseCrs(["urn:ogc:def:crs:EPSG::4326", "urn:ogc:def:crs:EPSG::25833"])).toBe(
            "urn:ogc:def:crs:EPSG::25833"
        );
        expect(chooseCrs(["urn:ogc:def:crs:EPSG::4258"])).toBe("EPSG:3857");
    });
});

describe("getFeatureUrl", () => {
    const request = {
        endpoint: "https://example.org/wfs?map=x",
        featureType: "app:landesgrenze",
        outputFormat: "application/geo+json",
        srsName: "EPSG:3857",
        maxFeatures: 1000
    };

    it("names type and limit as WFS 2.0 does", () => {
        const url = getFeatureUrl({ ...request, version: "2.0.0", extent: [1, 2, 3, 4] });
        expect(Object.fromEntries(url.searchParams)).toEqual({
            map: "x",
            SERVICE: "WFS",
            VERSION: "2.0.0",
            REQUEST: "GetFeature",
            TYPENAMES: "app:landesgrenze",
            OUTPUTFORMAT: "application/geo+json",
            SRSNAME: "EPSG:3857",
            COUNT: "1000",
            BBOX: "1,2,3,4,EPSG:3857"
        });
    });

    it("names type and limit as WFS 1.1 does, without extent all features", () => {
        const params = getFeatureUrl({ ...request, version: "1.1.0" }).searchParams;
        expect(params.get("TYPENAME")).toBe("app:landesgrenze");
        expect(params.get("MAXFEATURES")).toBe("1000");
        expect(params.has("TYPENAMES")).toBe(false);
        expect(params.has("BBOX")).toBe(false);
    });
});

describe("probeWfsFeatureType", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const request = {
        endpoint: "https://example.org/wfs",
        version: "2.0.0" as const,
        featureType: "app:a",
        srsName: "EPSG:3857"
    };
    const respond = (body: string, status = 200) =>
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(body, { status }))
        );

    it("accepts a feature collection in the requested encoding", async () => {
        respond(`{"type":"FeatureCollection","features":[]}`);
        await expect(probeWfsFeatureType({ ...request, outputFormat: "application/json" })).resolves.toEqual({
            ok: true
        });
        expect(new URL(vi.mocked(fetch).mock.calls[0]![0] as URL).searchParams.get("COUNT")).toBe("1");

        respond(`<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0"/>`);
        await expect(probeWfsFeatureType({ ...request, outputFormat: "GML2" })).resolves.toEqual({ ok: true });
    });

    it("reports exception reports (sent with HTTP 200), HTTP and network errors", async () => {
        respond(`<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1"><ows:Exception>
            <ows:ExceptionText>Unknown feature type</ows:ExceptionText></ows:Exception></ows:ExceptionReport>`);
        await expect(probeWfsFeatureType({ ...request, outputFormat: "application/json" })).resolves.toEqual({
            ok: false,
            message: "Unknown feature type"
        });
        respond("<html>Error</html>", 500);
        await expect(probeWfsFeatureType({ ...request, outputFormat: "GML2" })).resolves.toEqual({
            ok: false,
            message: "HTTP 500"
        });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new TypeError("Failed to fetch");
            })
        );
        await expect(probeWfsFeatureType({ ...request, outputFormat: "GML2" })).resolves.toEqual({
            ok: false,
            message: "Failed to fetch"
        });
    });
});
