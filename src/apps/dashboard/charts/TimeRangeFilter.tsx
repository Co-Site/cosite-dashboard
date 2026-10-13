import { Button, chakra, Flex, Group, Input, Text } from "@chakra-ui/react";
import { useIntl } from "open-pioneer:react-hooks";
import { useId, useState } from "react";
import { fromLocalInputValue, presetFilter, TIME_RANGE_PRESETS, TimeFilter, toLocalInputValue } from "./timeRange";

export interface TimeRangeFilterProps {
    value: TimeFilter;
    onChange(value: TimeFilter): void;
}

/**
 * Time filter with presets (last 24 h / 7 / 30 days) and a custom from/to range.
 */
export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
    const intl = useIntl();
    const fromId = useId();
    const toId = useId();

    // While the inputs do not form a valid range, the edited values are kept locally.
    const [draft, setDraft] = useState<{ from: string; to: string }>();
    // The entire period has no meaningful start date (it starts at the first observation of each sensor).
    const entirePeriod = value.preset === "all" && !draft;
    const from = draft?.from ?? (entirePeriod ? "" : toLocalInputValue(value.range.from));
    const to = draft?.to ?? toLocalInputValue(value.range.to);

    const fromDate = fromLocalInputValue(from);
    const toDate = fromLocalInputValue(to);
    const invalid = !entirePeriod && (!fromDate || !toDate || fromDate >= toDate);

    const updateRange = (nextFrom: string, nextTo: string) => {
        const f = fromLocalInputValue(nextFrom);
        const t = fromLocalInputValue(nextTo);
        if (f && t && f < t) {
            setDraft(undefined);
            onChange({ preset: undefined, range: { from: f, to: t } });
        } else {
            setDraft({ from: nextFrom, to: nextTo });
        }
    };

    return (
        <Flex
            role="group"
            aria-label={intl.formatMessage({ id: "timeFilter.label" })}
            gap={3}
            alignItems="center"
            wrap="wrap"
        >
            <Group attached>
                {TIME_RANGE_PRESETS.map((preset) => (
                    <Button
                        key={preset}
                        size="xs"
                        variant={value.preset === preset ? "solid" : "outline"}
                        aria-pressed={value.preset === preset}
                        onClick={() => {
                            setDraft(undefined);
                            onChange(presetFilter(preset));
                        }}
                    >
                        {intl.formatMessage({ id: `timeFilter.preset.${preset}` })}
                    </Button>
                ))}
            </Group>
            <Flex gap={2} alignItems="center">
                <chakra.label htmlFor={fromId} fontSize="sm">
                    {intl.formatMessage({ id: "timeFilter.from" })}
                </chakra.label>
                <Input
                    id={fromId}
                    type="datetime-local"
                    size="xs"
                    width="auto"
                    value={from}
                    max={to}
                    aria-invalid={invalid}
                    onChange={(e) => updateRange(e.target.value, to)}
                />
                <chakra.label htmlFor={toId} fontSize="sm">
                    {intl.formatMessage({ id: "timeFilter.to" })}
                </chakra.label>
                <Input
                    id={toId}
                    type="datetime-local"
                    size="xs"
                    width="auto"
                    value={to}
                    min={from}
                    aria-invalid={invalid}
                    onChange={(e) => updateRange(from, e.target.value)}
                />
            </Flex>
            {invalid && (
                <Text fontSize="sm" color="fg.error">
                    {intl.formatMessage({ id: "timeFilter.invalid" })}
                </Text>
            )}
        </Flex>
    );
}
