// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { NativeSelect } from "@chakra-ui/react";
import { createLogger } from "@open-pioneer/core";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { LocaleService } from "@open-pioneer/runtime";
import { useIntl, useService } from "open-pioneer:react-hooks";

const LOG = createLogger("dashboard:LanguageSelector");

/**
 * Select box to switch the application's language (live, without restart).
 */
export function LanguageSelector() {
    const intl = useIntl();
    const localeService = useService<LocaleService>("runtime.LocaleService");
    const current = useReactiveSnapshot(
        () => localeService.messageLocale.language,
        [localeService]
    );
    const languages = localeService.supportedMessageLocales.map((locale) => locale.language);

    return (
        <NativeSelect.Root size="xs" width="auto">
            <NativeSelect.Field
                aria-label={intl.formatMessage({ id: "language.label" })}
                value={current}
                onChange={(event) => {
                    localeService
                        .changeLocale(new Intl.Locale(event.currentTarget.value))
                        .catch((error) => LOG.error("Failed to change the language.", error));
                }}
            >
                {languages.map((language) => (
                    <option key={language} value={language}>
                        {languageName(language)}
                    </option>
                ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
        </NativeSelect.Root>
    );
}

/** Name of the language in the language itself, e.g. "Deutsch", "English". */
function languageName(language: string): string {
    const name = new Intl.DisplayNames([language], { type: "language" }).of(language) ?? language;
    return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}
