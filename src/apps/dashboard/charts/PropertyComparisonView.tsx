import { chakra, Flex, NativeSelect, Text } from "@chakra-ui/react";
import { useIntl } from "open-pioneer:react-hooks";
import { ChangeEvent, useId } from "react";
import { ObservedPropertyGroup } from "../dataLayers/sta/observedProperties";

export interface PropertyComparisonViewProps {
    /** Observed properties to choose from. */
    properties: ObservedPropertyGroup[];

    /** Key of the chosen observed property. */
    value: string | undefined;
    onChange(key: string): void;
}

/**
 * Selection of an observed property; all sensors that measure it are compared in one chart.
 */
export function PropertyComparisonView(props: PropertyComparisonViewProps) {
    const { properties, value, onChange } = props;
    const intl = useIntl();
    const selectId = useId();

    // Names of the observed properties are translated by the app; unknown keys are shown as they are.
    const propertyName = (key: string) => intl.formatMessage({ id: `observedProperty.${key}`, defaultMessage: key });
    const selectProperty = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value);

    if (properties.length === 0) {
        return <Text color="fg.muted">{intl.formatMessage({ id: "panel.property.none" })}</Text>;
    }
    return (
        <Flex direction="column" height="100%" gap={2} minWidth={0}>
            <Flex alignItems="center" gap={2} wrap="wrap">
                <chakra.label htmlFor={selectId} fontSize="sm" flexShrink={0}>
                    {intl.formatMessage({ id: "panel.property.label" })}
                </chakra.label>
                <NativeSelect.Root size="xs" maxWidth="sm">
                    <NativeSelect.Field id={selectId} value={value ?? ""} onChange={selectProperty}>
                        {properties.map(({ key }) => (
                            <option key={key} value={key}>
                                {propertyName(key)}
                            </option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Flex>
        </Flex>
    );
}
