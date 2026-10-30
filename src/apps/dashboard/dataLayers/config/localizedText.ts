/**
 * A text in the data layer configuration: either a plain string (same for all languages)
 * or an object with one entry per language, e.g. `{ "de": "Ebenen", "en": "Layers" }`.
 */
export type LocalizedText = string | Record<string, string>;

/** Language used if a text is not available in the requested language. */
const FALLBACK_LANGUAGE = "en";

/**
 * Returns the text for the given language (e.g. `"de"`).
 * Falls back to English, then to the first available translation.
 */
export function localize(text: LocalizedText, language: string): string;
export function localize(text: LocalizedText | undefined, language: string): string | undefined;
export function localize(text: LocalizedText | undefined, language: string): string | undefined {
    if (text == null || typeof text === "string") {
        return text;
    }
    return text[language] ?? text[FALLBACK_LANGUAGE] ?? Object.values(text)[0];
}

export function isLocalizedText(value: unknown): value is LocalizedText {
    if (typeof value === "string") {
        return true;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const entries = Object.values(value);
    return entries.length > 0 && entries.every((entry) => typeof entry === "string");
}
