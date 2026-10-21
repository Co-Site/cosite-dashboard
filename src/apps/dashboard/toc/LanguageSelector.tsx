import { SegmentGroup } from "@chakra-ui/react";
import { createLogger } from "@open-pioneer/core";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { LocaleService } from "@open-pioneer/runtime";
import { useIntl, useService } from "open-pioneer:react-hooks";

const LOG = createLogger("dashboard:LanguageSelector");

/** Order of the languages in the switch. */
const LANGUAGE_ORDER = ["en", "de"];

/**
 * Switch (EN | DE) to change the application's language (live, without restart).
 */
export function LanguageSelector() {
    const intl = useIntl();
    const localeService = useService<LocaleService>("runtime.LocaleService");
    const current = useReactiveSnapshot(() => localeService.messageLocale.language, [localeService]);
    const languages = localeService.supportedMessageLocales
        .map((locale) => locale.language)
        .sort((a, b) => order(a) - order(b));

    const changeLanguage = (details: SegmentGroup.ValueChangeDetails) => {
        if (!details.value || details.value === current) {
            return;
        }
        localeService
            .changeLocale(new Intl.Locale(details.value))
            .catch((error) => LOG.error("Failed to change the language.", error));
    };

    return (
        <SegmentGroup.Root
            size="xs"
            aria-label={intl.formatMessage({ id: "language.label" })}
            value={current}
            onValueChange={changeLanguage}
        >
            <SegmentGroup.Indicator />
            {languages.map((language) => (
                <SegmentGroup.Item key={language} value={language} title={languageName(language)}>
                    <SegmentGroup.ItemText>{language.toUpperCase()}</SegmentGroup.ItemText>
                    <SegmentGroup.ItemHiddenInput aria-label={languageName(language)} />
                </SegmentGroup.Item>
            ))}
        </SegmentGroup.Root>
    );
}

function order(language: string): number {
    const index = LANGUAGE_ORDER.indexOf(language);
    return index === -1 ? LANGUAGE_ORDER.length : index;
}

/** Name of the language in the language itself, e.g. "Deutsch", "English". */
function languageName(language: string): string {
    const name = new Intl.DisplayNames([language], { type: "language" }).of(language) ?? language;
    return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}
