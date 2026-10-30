import { afterEach, describe, expect, it, vi } from "vitest";
import {
    CapabilitiesError,
    createCapabilitiesCache,
    exceptionMessage,
    fetchCapabilitiesText,
    normalizeServiceEndpoint
} from "./ogcService";

describe("normalizeServiceEndpoint", () => {
    it("removes the parameters of a pasted request URL and keeps others", () => {
        expect(
            normalizeServiceEndpoint(" https://example.org/wms?service=WMS&REQUEST=GetCapabilities&Version=1.3.0 ")
        ).toBe("https://example.org/wms");
        expect(normalizeServiceEndpoint("https://example.org/cgi?map=/maps/x.map&SERVICE=WMS")).toBe(
            "https://example.org/cgi?map=%2Fmaps%2Fx.map"
        );
        expect(
            normalizeServiceEndpoint("https://example.org/wfs?SERVICE=WFS&REQUEST=GetFeature&TYPENAMES=ns:a&count=5")
        ).toBe("https://example.org/wfs?count=5");
    });

    it("rejects other protocols and invalid URLs", () => {
        expect(() => normalizeServiceEndpoint("javascript:alert(1)")).toThrow(/protocol/);
        expect(() => normalizeServiceEndpoint("maps.dwd.de")).toThrow(/Invalid URL/);
    });
});

describe("exceptionMessage", () => {
    it("reads WMS service exceptions and OWS exception reports", () => {
        expect(exceptionMessage("<ServiceExceptionReport><ServiceException>Bad layer</ServiceException>")).toBe(
            "Bad layer"
        );
        expect(
            exceptionMessage(`<ows:ExceptionReport><ows:Exception exceptionCode="InvalidParameterValue">
                <ows:ExceptionText> Unknown type </ows:ExceptionText></ows:Exception></ows:ExceptionReport>`)
        ).toBe("Unknown type");
        expect(exceptionMessage("<html>Not found</html>")).toBeUndefined();
    });
});

describe("fetchCapabilitiesText", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("requests GetCapabilities with the given parameters", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("<WFS_Capabilities/>"))
        );
        await expect(fetchCapabilitiesText("https://example.org/wfs?map=x", { SERVICE: "WFS" })).resolves.toBe(
            "<WFS_Capabilities/>"
        );
        const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as URL);
        expect(url.searchParams.get("map")).toBe("x");
        expect(url.searchParams.get("SERVICE")).toBe("WFS");
        expect(url.searchParams.get("REQUEST")).toBe("GetCapabilities");
    });

    it("distinguishes network errors from HTTP errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new TypeError("Failed to fetch");
            })
        );
        await expect(fetchCapabilitiesText("https://example.org/wfs", {})).rejects.toMatchObject({
            kind: "unreachable"
        });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("", { status: 404 }))
        );
        const error = await fetchCapabilitiesText("https://example.org/wfs", {}).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(CapabilitiesError);
        expect(error).toMatchObject({ kind: "invalid" });
    });
});

describe("createCapabilitiesCache", () => {
    it("loads once per endpoint and retries after a failure", async () => {
        const load = vi.fn(async (endpoint: string) => {
            if (endpoint === "fail" && load.mock.calls.length === 1) {
                throw new Error("down");
            }
            return endpoint.toUpperCase();
        });
        const cache = createCapabilitiesCache(load);
        await expect(cache.fetch("a")).resolves.toBe("A");
        await expect(cache.fetch("a")).resolves.toBe("A");
        expect(load).toHaveBeenCalledTimes(1);
        expect(cache.peek("a")).toBe("A");

        load.mockClear();
        await expect(cache.fetch("fail")).rejects.toThrow("down");
        expect(cache.peek("fail")).toBeUndefined();
        await expect(cache.fetch("fail")).resolves.toBe("FAIL");
        expect(load).toHaveBeenCalledTimes(2);
    });
});
