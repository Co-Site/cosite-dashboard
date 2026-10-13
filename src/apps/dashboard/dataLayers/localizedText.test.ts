import { describe, expect, it } from "vitest";
import { isLocalizedText, localize } from "./localizedText";

describe("localize", () => {
    it("returns plain strings unchanged", () => {
        expect(localize("WMS", "de")).toBe("WMS");
        expect(localize(undefined, "de")).toBeUndefined();
    });

    it("picks the requested language, then English, then the first entry", () => {
        expect(localize({ de: "Ebenen", en: "Layers" }, "de")).toBe("Ebenen");
        expect(localize({ de: "Ebenen", en: "Layers" }, "fr")).toBe("Layers");
        expect(localize({ de: "Ebenen", nl: "Lagen" }, "fr")).toBe("Ebenen");
    });
});

describe("isLocalizedText", () => {
    it("accepts strings and objects with string values", () => {
        expect(isLocalizedText("x")).toBe(true);
        expect(isLocalizedText({ de: "x", en: "y" })).toBe(true);
    });

    it("rejects everything else", () => {
        expect(isLocalizedText({})).toBe(false);
        expect(isLocalizedText({ de: 1 })).toBe(false);
        expect(isLocalizedText(["x"])).toBe(false);
        expect(isLocalizedText(null)).toBe(false);
    });
});
